'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent('frontend_error', {
      page: window.location.pathname,
      error_message: error.message.slice(0, 500),
    });
  }, [error]);

  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        {error.message || 'An unexpected error occurred on this page.'}
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
