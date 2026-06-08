import Link from 'next/link';
import { FolderX, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/70 text-zinc-300">
        <FolderX className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-semibold text-white">Route not found</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        This CryptoDrive page does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/40 hover:text-white"
      >
        <Home className="h-4 w-4" />
        Back home
      </Link>
    </div>
  );
}
