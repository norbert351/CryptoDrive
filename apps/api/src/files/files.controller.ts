import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Readable } from 'stream';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { ShelbyService } from '../shelby/shelby.service';
import { FinalizeUploadDto } from './dto/finalize-upload.dto';

@Controller()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly files: FilesService,
    private readonly shelby: ShelbyService,
  ) {
    const uploadRoot = join(process.cwd(), 'data', 'pending-uploads');
    if (!existsSync(uploadRoot)) {
      mkdirSync(uploadRoot, { recursive: true });
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, join(process.cwd(), 'data', 'pending-uploads')),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: Request & { walletAddress?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.path) {
      throw new BadRequestException('file field is required');
    }
    const wallet = req.walletAddress!;
    return this.files.prepareUpload({
      walletAddress: wallet,
      diskPath: file.path,
      originalFilename: file.originalname,
    });
  }

  @Post('upload/complete')
  @UseGuards(JwtAuthGuard)
  async complete(
    @Req() req: Request & { walletAddress?: string },
    @Body() body: FinalizeUploadDto,
  ) {
    return this.files.finalizeUpload({
      walletAddress: req.walletAddress!,
      sessionId: body.sessionId,
      registerTxHash: body.registerTxHash,
      iv: body.iv,
      encryptedDek: body.encryptedDek,
      mimeType: body.mimeType,
    });
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: Request & { walletAddress?: string },
    @Query('owner') owner: string,
  ) {
    if (!owner) {
      throw new BadRequestException('owner query parameter is required');
    }
    return this.files.listForOwner(req.walletAddress!, owner);
  }

  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Req() req: Request & { walletAddress?: string },
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    this.logger.log(`downloadFile route GET /download/${id} wallet=${req.walletAddress}`);
    await this.streamShelbyFile(req, res, id);
  }

  @Get('files/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFileAlias(
    @Req() req: Request & { walletAddress?: string },
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    this.logger.log(`downloadFileAlias route GET /files/${id}/download wallet=${req.walletAddress}`);
    await this.streamShelbyFile(req, res, id);
  }

  @Get('debug/download/:id')
  @UseGuards(JwtAuthGuard)
  async debugDownload(
    @Req() req: Request & { walletAddress?: string },
    @Param('id') id: string,
  ) {
    this.logger.log(`debugDownload route GET /debug/download/${id} wallet=${req.walletAddress}`);
    try {
      const row = await this.files.verifyFileAccess(req.walletAddress!, id);
      const diagnostics: Record<string, unknown> = {
        fileExistsInDb: true,
        fileId: row.id,
        filename: row.filename,
        blobName: row.blobName,
        ownerAddress: row.ownerAddress,
        size: row.size,
        mimeType: row.mimeType,
        iv: !!row.iv,
        encryptedDek: !!row.encryptedDek,
      };

      try {
        this.logger.log(`debugDownload: calling Shelby getBlob account=${row.ownerAddress} blobName="${row.blobName}"`);
        const shelbyResult = await this.shelby.getBlob(row.ownerAddress, row.blobName);
        diagnostics.shelbyConnection = true;
        diagnostics.shelbyContentLength = shelbyResult.contentLength;
        diagnostics.shelbyAccount = shelbyResult.account;
        diagnostics.shelbyBlobName = shelbyResult.name;
        diagnostics.shelbyStreamType = typeof shelbyResult.readable;

        const reader = shelbyResult.readable.getReader();
        const firstChunk = await reader.read();
        reader.releaseLock();

        if (firstChunk.done) {
          diagnostics.shelbyBlobEmpty = true;
          diagnostics.conclusion = 'Blob exists in Shelby but is empty';
        } else {
          diagnostics.shelbyBlobEmpty = false;
          diagnostics.firstChunkSize = firstChunk.value.byteLength;
          diagnostics.conclusion = 'Blob exists in Shelby and is readable';
        }
      } catch (shelbyError) {
        diagnostics.shelbyConnection = false;
        diagnostics.shelbyError = shelbyError instanceof Error ? shelbyError.message : String(shelbyError);
        diagnostics.shelbyStack = shelbyError instanceof Error ? shelbyError.stack : undefined;
        diagnostics.conclusion = 'Failed to download from Shelby';
      }

      return diagnostics;
    } catch (accessError) {
      return {
        fileExistsInDb: false,
        error: accessError instanceof Error ? accessError.message : String(accessError),
        conclusion: 'File access verification failed',
      };
    }
  }

  private async streamShelbyFile(
    req: Request & { walletAddress?: string },
    res: Response,
    id: string,
  ) {
    try {
      const fileInfo = await this.files.streamFile(req.walletAddress!, id);

      const safeFilename = fileInfo.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const disposition = `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(fileInfo.fileName)}`;

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', disposition);
      res.setHeader('Content-Length', fileInfo.contentLength);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

      this.logger.log(
        `streamShelbyFile: streaming file id=${id} filename="${safeFilename}" type=${fileInfo.mimeType} length=${fileInfo.contentLength}`,
      );

      const nodeStream = Readable.fromWeb(fileInfo.stream as import('stream/web').ReadableStream);
      nodeStream.on('error', (error) => {
        this.logger.error(`streamShelbyFile: stream error id=${id}: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Download stream error' });
        }
      });
      nodeStream.pipe(res);
    } catch (error) {
      this.logger.error(`streamShelbyFile: error id=${id}: ${error instanceof Error ? error.message : String(error)}`);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Download failed' });
      }
    }
  }
}
