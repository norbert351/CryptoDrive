'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      try {
        const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
        gtag('event', 'frontend_error', {
          page: window.location.pathname,
          error_message: error.message.slice(0, 500),
        });
      } catch {
        // gtag not available at global level
      }
    }
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#030712] text-zinc-100 antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-white">CryptoDrive crashed while loading</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {error.message || 'A top-level provider or layout failed to render.'}
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
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
