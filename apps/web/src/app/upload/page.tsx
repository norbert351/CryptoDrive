'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ShelbyBlobClient } from '@shelby-protocol/sdk/browser';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-core';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { apiFetch, getAccessToken, setAccessToken } from '@/lib/api';
import { loginWithWallet } from '@/lib/auth-wallet';
import { trackUpload } from '@/lib/analytics';
import { trackEvent, setTag, upgradeSession } from '@/lib/analytics/clarity';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  deriveWrapKeyFromWallet,
  generateDek,
  encryptFile,
  wrapDek,
  bufToHex,
} from '@/lib/crypto';

type Phase =
  | 'idle'
  | 'auth'
  | 'key'
  | 'encrypting'
  | 'uploading'
  | 'encoding'
  | 'chain'
  | 'rpc'
  | 'done'
  | 'error';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Ready',
  auth: 'Authenticating...',
  key: 'Deriving encryption key...',
  encrypting: 'Encrypting file...',
  uploading: 'Uploading to API...',
  encoding: 'Preparing chain payload...',
  chain: 'Registering on Aptos...',
  rpc: 'Uploading to Shelby...',
  done: 'Done',
  error: 'Error',
};

const UPLOAD_TIMEOUT_MS = 60_000;
const SERVER_FINALIZE_TIMEOUT_MS = 75_000;

function timeoutMessage(step: string, timeoutMs: number) {
  return `${step} timed out after ${Math.round(timeoutMs / 1000)} seconds`;
}

async function readErrorResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const body = await response.json().catch(() => null);
    const message = body?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    if (body) return JSON.stringify(body);
  }
  return (await response.text()) || response.statusText;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  step: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(timeoutMessage(step, timeoutMs));
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForStep<T>(
  step: string,
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(timeoutMessage(step, timeoutMs))),
      timeoutMs,
    );
    promise.then(
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

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function UploadContent() {
  const wallet = useWallet();
  const { connected, account, signAndSubmitTransaction } = wallet;

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [phaseDetail, setPhaseDetail] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const runUpload = async () => {
    if (!connected || !account) {
      setMessage('Connect your wallet first.');
      return;
    }
    if (!file) {
      setMessage('Choose a file first.');
      return;
    }

    trackEvent('upload_started');
    setMessage(null);
    setPhaseDetail('Checking wallet session.');
    setPhase('auth');
    setProgress(5);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'unknown';
    setTag('file_type', ext);

    const sizeBucket = file.size < 1024 ? '<1kb' : file.size < 102400 ? '1kb-100kb' : file.size < 1048576 ? '100kb-1mb' : file.size < 10485760 ? '1mb-10mb' : file.size < 104857600 ? '10mb-100mb' : '>100mb';
    setTag('file_size', sizeBucket);

    if (file.size > 104857600) {
      upgradeSession('large_upload');
    }

    try {
      let token = getAccessToken();
      if (!token) {
        token = await loginWithWallet(wallet, apiBase);
        setAccessToken(token);
      }
      setPhaseDetail('Wallet session ready.');
      setProgress(12);

      setPhase('key');
      setPhaseDetail('Approve the wallet signature if prompted.');
      const wrapKey = await deriveWrapKeyFromWallet(wallet);
      setProgress(20);

      setPhase('encrypting');
      setPhaseDetail('Encrypting bytes locally before upload.');
      const dek = await generateDek();
      const { ciphertext, iv } = await encryptFile(dek, file);
      const encryptedDek = await wrapDek(dek, wrapKey);
      const ivHex = bufToHex(iv);
      setProgress(35);

      setPhase('uploading');
      setPhaseDetail('Sending encrypted bytes to the API for Shelby commitments.');
      const encryptedBuffer = ciphertext.buffer.slice(
        ciphertext.byteOffset,
        ciphertext.byteOffset + ciphertext.byteLength,
      ) as ArrayBuffer;
      const encryptedBlob = new File([encryptedBuffer], file.name, {
        type: 'application/octet-stream',
      });
      const fd = new FormData();
      fd.append('file', encryptedBlob);

      const prepRes = await fetchWithTimeout(
        `${apiBase}/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
        UPLOAD_TIMEOUT_MS,
        'Preparing Shelby commitments',
      );
      if (!prepRes.ok) throw new Error(await readErrorResponse(prepRes));

      const prep = (await prepRes.json()) as {
        sessionId: string;
        blobName: string;
        blob_merkle_root: string;
        raw_data_size: number;
        numChunksets: number;
        expirationMicros: number;
        encoding: number;
      };
      setPhaseDetail('Shelby commitments are ready.');
      setProgress(50);

      setPhase('encoding');
      setPhaseDetail('Building the Aptos registration payload.');
      const payload = ShelbyBlobClient.createRegisterBlobPayload({
        account: account.address,
        blobName: prep.blobName,
        blobSize: prep.raw_data_size,
        blobMerkleRoot: prep.blob_merkle_root,
        expirationMicros: prep.expirationMicros,
        numChunksets: prep.numChunksets,
        encoding: prep.encoding,
      });

      setPhase('chain');
      setPhaseDetail('Sign the Aptos registration transaction in your wallet.');
      const submitted = await signAndSubmitTransaction({
        data: payload,
      } as InputTransactionData);
      setPhaseDetail(
        `Submitted Aptos transaction ${shortHash(submitted.hash)}. Waiting for confirmation.`,
      );

      const aptos = new Aptos(
        new AptosConfig({
          network: Network.TESTNET,
          ...(process.env.NEXT_PUBLIC_APTOS_API_KEY
            ? { clientConfig: { API_KEY: process.env.NEXT_PUBLIC_APTOS_API_KEY } }
            : {}),
        }),
      );
      await waitForStep(
        'Aptos transaction confirmation',
        aptos.waitForTransaction({
          transactionHash: submitted.hash,
          options: { checkSuccess: true },
        }),
        UPLOAD_TIMEOUT_MS,
      );
      setProgress(75);

      setPhase('rpc');
      setPhaseDetail(
        'Backend is calling Shelby putBlob. This step times out if Shelby does not finish.',
      );
      await apiFetch('/upload/complete', {
        method: 'POST',
        timeoutMs: SERVER_FINALIZE_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: prep.sessionId,
          registerTxHash: submitted.hash,
          iv: ivHex,
          encryptedDek,
          mimeType: file.type || 'application/octet-stream',
        }),
      });

      if (file) {
        trackUpload(file.name, file.size);
        trackEvent('upload_completed');
      }
      setProgress(100);
      setPhase('done');
      setPhaseDetail('Upload complete.');
      setMessage('File encrypted and uploaded. Return to the dashboard to download.');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setPhase('error');
      setPhaseDetail(
        errorMessage.toLowerCase().includes('timed out')
          ? 'The upload stopped waiting. Check the backend logs for the last completed checkpoint.'
          : 'Upload failed before completion.',
      );
      setMessage(errorMessage);
      trackEvent('upload_failed');
      upgradeSession('upload_error');
    }
  };

  const previewUrl = useMemo(() => {
    if (!file || (!file.type.startsWith('image/') && file.type !== 'application/pdf')) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const busy = phase !== 'idle' && phase !== 'error' && phase !== 'done';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload a file</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Files are AES-256-GCM encrypted in your browser before upload.
          Only your wallet can decrypt them.
        </p>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10 text-center transition hover:border-emerald-600/60"
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer font-medium text-emerald-400 hover:underline"
        >
          Choose a file
        </label>
        <p className="mt-1 text-sm text-zinc-500">or drag and drop here</p>
        {file ? <p className="mt-4 truncate text-sm text-zinc-300">{file.name}</p> : null}
      </div>

      {previewUrl && file?.type.startsWith('image/') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Preview"
          className="max-h-56 w-auto rounded-lg border border-zinc-800"
        />
      ) : null}
      {previewUrl && file?.type === 'application/pdf' ? (
        <iframe
          title="PDF preview"
          src={previewUrl}
          className="h-64 w-full rounded-lg border border-zinc-800"
        />
      ) : null}

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {PHASE_LABEL[phase]}
        </p>
        {phaseDetail ? (
          <p className="text-sm leading-6 text-zinc-400">{phaseDetail}</p>
        ) : null}
      </div>

      {message ? (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            phase === 'error'
              ? 'border border-red-900/50 bg-red-950/40 text-red-300'
              : 'border border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="button"
        id="upload-btn"
        disabled={!connected || !file || busy}
        onClick={() => void runUpload()}
        className="w-full rounded-lg bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
      >
        {busy ? 'Working...' : 'Encrypt & Upload'}
      </button>

      <p className="text-center text-xs text-zinc-600">
        Your wallet signs once to derive an encryption key. That key is never sent to any server.
      </p>
    </div>
  );
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}
