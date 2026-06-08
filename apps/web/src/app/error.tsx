'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-semibold text-white">CryptoDrive could not load</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {error.message || 'A route chunk or client component failed while rendering.'}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-zinc-600">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
