import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountAddress,
  Aptos,
  AptosConfig,
  Network,
} from '@aptos-labs/ts-sdk';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { ShelbyService } from '../shelby/shelby.service';

type PendingUpload = {
  blobName: string;
  diskPath: string;
  size: number;
  ownerAddress: string;
  originalFilename: string;
};

const pending = new Map<string, PendingUpload>();
const logger = new Logger('FilesService');
const UPLOAD_STEP_TIMEOUT_MS = 60_000;

function safeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return (base.length ? base : 'file').slice(0, 200);
}

async function putBlobWithRetry(
  fn: (attempt: number) => Promise<void>,
  attempts = 3,
): Promise<void> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await fn(i + 1);
      return;
    } catch (e) {
      last = e;
      if (isShelbyAuthError(e) || isUploadTimeoutError(e)) {
        throw e;
      }
      logger.warn(
        `Shelby putBlob attempt ${i + 1}/${attempts} failed: ${collectErrorMessages(e)}`,
      );
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw last;
}

class UploadTimeoutError extends Error {
  constructor(
    readonly step: string,
    readonly timeoutMs: number,
  ) {
    super(`${step} timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    this.name = 'UploadTimeoutError';
  }
}

async function withTimeout<T>(
  step: string,
  task: Promise<T>,
  timeoutMs = UPLOAD_STEP_TIMEOUT_MS,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      try {
        onTimeout?.();
      } catch (error) {
        logger.warn(
          `${step} timeout cleanup failed: ${collectErrorMessages(error)}`,
        );
      }
      reject(new UploadTimeoutError(step, timeoutMs));
    }, timeoutMs);

    task.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function isUploadTimeoutError(error: unknown): error is UploadTimeoutError {
  return error instanceof UploadTimeoutError;
}

function isShelbyAuthError(error: unknown): boolean {
  const message = collectErrorMessages(error).toLowerCase();
  return (
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('api key not found')
  );
}

function collectErrorMessages(error: unknown): string {
  if (error instanceof Error) {
    const cause =
      'cause' in error && error.cause
        ? ` ${collectErrorMessages(error.cause)}`
        : '';
    return `${error.message}${cause}`;
  }
  return String(error);
}

@Injectable()
export class FilesService {
  private readonly pendingDir: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
    private readonly config: ConfigService,
    private readonly shelby: ShelbyService,
  ) {
    this.pendingDir = join(process.cwd(), 'data', 'pending-uploads');
    if (!existsSync(this.pendingDir)) {
      mkdirSync(this.pendingDir, { recursive: true });
    }
  }

  private aptos(): Aptos {
    const key = this.config.get<string>('APTOS_API_KEY');
    return new Aptos(
      new AptosConfig({
        network: Network.TESTNET,
        ...(key
          ? { clientConfig: { API_KEY: key } }
          : {}),
      }),
    );
  }

  async prepareUpload(args: {
    walletAddress: string;
    diskPath: string;
    originalFilename: string;
  }) {
    const sessionId = uuidv4();
    const fileStat = await fs.stat(args.diskPath);
    logger.log(
      `[${sessionId}] prepare upload: before file buffer read filename="${args.originalFilename}" diskBytes=${fileStat.size}`,
    );

    const data = await fs.readFile(args.diskPath);
    logger.log(
      `[${sessionId}] prepare upload: after file buffer read bufferBytes=${data.length} valid=${data.length === fileStat.size ? 'yes' : 'no'}`,
    );

    logger.log(`[${sessionId}] prepare upload: before blob encoding`);
    const commitments = await withTimeout(
      'Shelby commitment generation',
      this.shelby.generateCommitmentsForData(data),
    );
    logger.log(
      `[${sessionId}] prepare upload: after blob encoding rawBytes=${commitments.raw_data_size}`,
    );

    const blobName = `cryptodrive/${sessionId}/${safeFilename(args.originalFilename)}`;
    logger.log(`[${sessionId}] prepare upload: before encoding metadata lookup`);
    const encoding = await this.shelby.getDefaultEncodingEnumIndex();
    const numChunksets = await this.shelby.expectedTotalChunksets(
      commitments.raw_data_size,
    );
    logger.log(
      `[${sessionId}] prepare upload: after encoding metadata lookup encoding=${encoding} chunksets=${numChunksets}`,
    );
    const expirationMicros =
      (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000;

    pending.set(sessionId, {
      blobName,
      diskPath: args.diskPath,
      size: data.length,
      ownerAddress: args.walletAddress,
      originalFilename: args.originalFilename,
    });
    logger.log(
      `[${sessionId}] prepare upload: pending session stored blobName="${blobName}"`,
    );

    return {
      sessionId,
      blobName,
      blob_merkle_root: commitments.blob_merkle_root,
      raw_data_size: commitments.raw_data_size,
      numChunksets,
      expirationMicros,
      encoding,
    };
  }

  async finalizeUpload(args: {
    walletAddress: string;
    sessionId: string;
    registerTxHash: string;
    iv?: string;
    encryptedDek?: string;
    mimeType?: string;
  }) {
    const rec = pending.get(args.sessionId);
    if (!rec) {
      throw new NotFoundException('Unknown or expired upload session');
    }
    if (rec.ownerAddress !== args.walletAddress) {
      throw new ForbiddenException('Session belongs to another wallet');
    }

    const aptos = this.aptos();
    logger.log(
      `[${args.sessionId}] finalize upload: before Aptos transaction confirmation tx=${args.registerTxHash}`,
    );
    try {
      await withTimeout(
        'Aptos transaction confirmation',
        aptos.waitForTransaction({
          transactionHash: args.registerTxHash,
          options: { checkSuccess: true },
        }),
      );
    } catch (error) {
      if (isUploadTimeoutError(error)) {
        logger.error(
          `[${args.sessionId}] Aptos transaction confirmation timed out tx=${args.registerTxHash}`,
        );
        throw new RequestTimeoutException({
          message: 'Aptos transaction confirmation timed out after 60 seconds',
          transactionHash: args.registerTxHash,
        });
      }
      throw error;
    }
    logger.log(
      `[${args.sessionId}] finalize upload: after Aptos transaction confirmation tx=${args.registerTxHash}`,
    );

    logger.log(
      `[${args.sessionId}] finalize upload: before Aptos transaction fetch tx=${args.registerTxHash}`,
    );
    const tx = await aptos.getTransactionByHash({
      transactionHash: args.registerTxHash,
    });
    const sender =
      tx && typeof tx === 'object' && 'sender' in tx
        ? String((tx as { sender: unknown }).sender)
        : null;
    if (
      !sender ||
      AccountAddress.fromString(sender).toString() !==
        AccountAddress.fromString(args.walletAddress).toString()
    ) {
      throw new BadRequestException(
        'Registration transaction sender does not match wallet',
      );
    }
    logger.log(
      `[${args.sessionId}] finalize upload: after Aptos transaction verification sender=${sender}`,
    );

    logger.log(`[${args.sessionId}] finalize upload: before Shelby client creation`);
    const client = await this.shelby.createShelbyClient();
    logger.log(`[${args.sessionId}] finalize upload: after Shelby client creation`);
    const abs = rec.diskPath;
    const account = AccountAddress.fromString(args.walletAddress);

    const shelbyRpcUrl = (client.rpc as { baseUrl?: string }).baseUrl ?? 'unknown';
    try {
      await putBlobWithRetry(async (attempt) => {
        logger.log(
          `[${args.sessionId}] finalize upload: before stream creation attempt=${attempt} bytes=${rec.size} shelbyRpcUrl=${shelbyRpcUrl}`,
        );
        const stream = createReadStream(abs);
        stream.once('open', () => {
          logger.log(
            `[${args.sessionId}] finalize upload: stream opened attempt=${attempt}`,
          );
        });
        stream.once('end', () => {
          logger.log(
            `[${args.sessionId}] finalize upload: stream ended attempt=${attempt}`,
          );
        });
        stream.once('close', () => {
          logger.log(
            `[${args.sessionId}] finalize upload: stream closed attempt=${attempt}`,
          );
        });
        stream.once('error', (error) => {
          logger.error(
            `[${args.sessionId}] finalize upload: stream error attempt=${attempt}: ${collectErrorMessages(error)}`,
          );
        });

        const web = Readable.toWeb(stream);
        logger.log(
          `[${args.sessionId}] finalize upload: after stream creation attempt=${attempt}`,
        );

        logger.log(
          `[${args.sessionId}] finalize upload: before putBlob attempt=${attempt} blobName="${rec.blobName}" totalBytes=${rec.size} rpcUrl=${shelbyRpcUrl}`,
        );
        try {
          await withTimeout(
            'Shelby putBlob',
            client.rpc.putBlob({
              account,
              blobName: rec.blobName,
              blobData: web,
              totalBytes: rec.size,
              onProgress: (progress: {
                phase: string;
                partIdx: number;
                totalParts: number;
                uploadedBytes: number;
                totalBytes: number;
              }) => {
                logger.log(
                  `[${args.sessionId}] putBlob progress phase=${progress.phase} part=${progress.partIdx + 1}/${progress.totalParts} uploaded=${progress.uploadedBytes}/${progress.totalBytes}`,
                );
              },
            }),
            UPLOAD_STEP_TIMEOUT_MS,
            () => {
              logger.error(
                `[${args.sessionId}] finalize upload: putBlob timed out, destroying stream attempt=${attempt}`,
              );
              stream.destroy(new Error('Shelby putBlob timed out'));
            },
          );
        } catch (putBlobError) {
          const msg = collectErrorMessages(putBlobError);
          const isMultipartComplete = msg.includes('Failed to complete multipart upload');
          logger.error(
            `[${args.sessionId}] finalize upload: putBlob failed attempt=${attempt} ` +
              `error="${msg}" ` +
              `isCompletionFailure=${isMultipartComplete} ` +
              `blobName="${rec.blobName}" ` +
              `totalBytes=${rec.size} ` +
              `rpcUrl=${shelbyRpcUrl} ` +
              `apiKeyPrefix=${(this.config.get<string>('SHELBY_API_KEY') ?? '').slice(0, 6)}...`,
          );
          throw putBlobError;
        }
        logger.log(
          `[${args.sessionId}] finalize upload: after putBlob attempt=${attempt}`,
        );
      });
    } catch (error) {
      const errorMsg = collectErrorMessages(error);
      logger.error(
        `[${args.sessionId}] finalize upload: putBlobWithRetry exhausted all attempts. ` +
          `blobName="${rec.blobName}" ` +
          `totalBytes=${rec.size} ` +
          `rpcUrl=${shelbyRpcUrl} ` +
          `error="${errorMsg}"`,
      );
      if (isShelbyAuthError(error)) {
        logger.error(
          `Shelby API authentication failed during putBlob: ${errorMsg}`,
        );
        throw new UnauthorizedException({
          message: 'Shelby API authentication failed',
        });
      }
      if (isUploadTimeoutError(error)) {
        logger.error(
          `[${args.sessionId}] Shelby upload timed out during ${error.step}: ${errorMsg}`,
        );
        throw new RequestTimeoutException({
          message: 'Shelby upload timed out after 60 seconds',
          step: error.step,
        });
      }
      throw error;
    }

    const id = uuidv4();
    logger.log(`[${args.sessionId}] finalize upload: before database insert`);
    await this.db.insert(schema.files).values({
      id,
      filename: rec.originalFilename,
      blobName: rec.blobName,
      ownerAddress: args.walletAddress,
      size: rec.size,
      mimeType: args.mimeType ?? null,
      iv: args.iv ?? null,
      encryptedDek: args.encryptedDek ?? null,
    });
    logger.log(`[${args.sessionId}] finalize upload: after database insert id=${id}`);

    pending.delete(args.sessionId);
    try {
      unlinkSync(abs);
      logger.log(`[${args.sessionId}] finalize upload: pending file removed`);
    } catch {
      /* ignore */
    }
    logger.log(`[${args.sessionId}] finalize upload: after upload completion`);

    return {
      id,
      blobName: rec.blobName,
      size: rec.size,
      registerTxHash: args.registerTxHash,
    };
  }

  async listForOwner(walletAddress: string, ownerQuery: string) {
    if (ownerQuery !== walletAddress) {
      throw new ForbiddenException('Owner filter must match authenticated wallet');
    }
    return this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.ownerAddress, walletAddress));
  }

  async getDownloadInfo(walletAddress: string, fileId: string) {
    logger.log(`getDownloadInfo: looking up file id=${fileId} wallet=${walletAddress}`);

    const [row] = await this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.id, fileId));

    if (!row) {
      logger.warn(`getDownloadInfo: file NOT FOUND in DB id=${fileId}`);
      throw new NotFoundException('File not found');
    }

    logger.log(`getDownloadInfo: file FOUND id=${fileId} filename="${row.filename}" owner=${row.ownerAddress}`);

    const isOwner = row.ownerAddress === walletAddress;

    if (!isOwner) {
      logger.log(`getDownloadInfo: wallet is NOT owner, checking shared access wallet=${walletAddress}`);
      const [share] = await this.db
        .select()
        .from(schema.sharedFiles)
        .where(
          and(
            eq(schema.sharedFiles.fileId, fileId),
            eq(schema.sharedFiles.sharedWith, walletAddress),
            isNull(schema.sharedFiles.revokedAt),
            or(
              isNull(schema.sharedFiles.expiresAt),
              gt(schema.sharedFiles.expiresAt, new Date()),
            ),
          ),
        );
      if (!share) {
        logger.warn(`getDownloadInfo: no active share found wallet=${walletAddress} fileId=${fileId}`);
        throw new ForbiddenException(
          'You do not have access to this file',
        );
      }
      logger.log(`getDownloadInfo: active share FOUND wallet=${walletAddress} fileId=${fileId}`);
    } else {
      logger.log(`getDownloadInfo: wallet IS owner, skipping share check`);
    }

    const apiBase = 'https://api.testnet.shelby.xyz';
    const shelbyUrl = `${apiBase}/shelby/v1/blobs/${row.ownerAddress}/${row.blobName}`;
    logger.log(`getDownloadInfo: returning metadata for id=${fileId} shelbyUrl=${shelbyUrl}`);

    return {
      fileId: row.id,
      fileName: row.filename,
      ownerWallet: row.ownerAddress,
      encrypted: Boolean(row.iv && row.encryptedDek),
      shelbyUrl,
      iv: row.iv ?? null,
      encryptionMetadata: row.encryptedDek
        ? {
            encryptedDek: row.encryptedDek,
            mimeType: row.mimeType,
          }
        : null,
    };
  }
}
