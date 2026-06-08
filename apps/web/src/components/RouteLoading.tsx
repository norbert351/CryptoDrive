import { Loader2 } from 'lucide-react';

export function RouteLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-sm font-medium text-zinc-300">Loading CryptoDrive</p>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Preparing your encrypted storage workspace.
      </p>
    </div>
  );
}
