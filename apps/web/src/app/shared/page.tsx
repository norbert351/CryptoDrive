'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileIcon,
  FileText,
  ImageIcon,
  Link2Off,
  Search,
  Share2,
  ShieldAlert,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { fetchSharedFiles, type SharedFile } from '@/lib/api';

type ShareFilter = 'all' | 'with-me' | 'by-me';

const fallbackSharedFiles: SharedFile[] = [];

function shortenAddress(address: string) {
  if (!address) return 'Unknown wallet';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
  if (mimeType?.startsWith('video/')) return <Video className="h-5 w-5" />;
  if (mimeType?.includes('pdf') || mimeType?.includes('document')) {
    return <FileText className="h-5 w-5" />;
  }
  return <FileIcon className="h-5 w-5" />;
}

function EmptySharedState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
        <Share2 className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function SharedFileList({ files, variant }: { files: SharedFile[]; variant: ShareFilter }) {
  if (files.length === 0) {
    return (
      <EmptySharedState
        title={variant === 'by-me' ? 'No outgoing shares' : 'No shared files yet'}
        description={
          variant === 'by-me'
            ? 'Files you share with other wallets will appear here once backend sharing is available.'
            : 'Files shared with your wallet will appear here when the shared-files endpoint returns data.'
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      {files.map((file) => (
        <div
          key={`${variant}-${file.id}`}
          className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-emerald-500/30 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <FileTypeIcon mimeType={file.mimeType} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{file.filename}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>{formatSize(file.size)}</span>
                <span>
                  {variant === 'by-me' ? 'Shared with' : 'Shared by'}{' '}
                  <span className="font-mono text-zinc-300">
                    {variant === 'by-me'
                      ? shortenAddress(file.sharedWith)
                      : shortenAddress(file.sharedBy || file.ownerAddress)}
                  </span>
                </span>
                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-red-500/40 hover:text-red-300"
            >
              <Link2Off className="h-4 w-4" />
              Remove access
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SharedContent() {
  const [files, setFiles] = useState<SharedFile[]>(fallbackSharedFiles);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ShareFilter>('all');

  useEffect(() => {
    let active = true;

    async function loadSharedFiles() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchSharedFiles();
        if (active) setFiles(Array.isArray(rows) ? rows : []);
      } catch (caught) {
        if (!active) return;
        setFiles([]);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Shared files endpoint is not available yet.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSharedFiles();

    return () => {
      active = false;
    };
  }, []);

  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const matchesSearch =
        !query ||
        file.filename.toLowerCase().includes(query) ||
        file.sharedBy.toLowerCase().includes(query) ||
        file.sharedWith.toLowerCase().includes(query);
      const matchesFilter = filter === 'all' || file.direction === filter;
      return matchesSearch && matchesFilter;
    });
  }, [files, filter, searchQuery]);

  const sharedWithMe = filteredFiles.filter((file) => file.direction !== 'by-me');
  const sharedByMe = filteredFiles.filter((file) => file.direction === 'by-me');

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
              Shared vault
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Shared Files
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Review files shared with your wallet and files you have shared with others.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-[30rem]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search shared files..."
                className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950/70 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/50"
              />
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as ShareFilter)}
              className="h-11 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 text-sm text-zinc-300 outline-none transition focus:border-emerald-500/50"
            >
              <option value="all">All shares</option>
              <option value="with-me">Shared with me</option>
              <option value="by-me">Shared by me</option>
            </select>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Shared files endpoint unavailable</p>
            <p className="mt-1 text-amber-200/75">
              GET /shared-files is wired as a frontend placeholder. No backend sharing logic was added.
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Shared With Me</h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-400">
                {sharedWithMe.length} files
              </span>
            </div>
            <SharedFileList files={sharedWithMe} variant="with-me" />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Shared By Me</h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-400">
                {sharedByMe.length} files
              </span>
            </div>
            <SharedFileList files={sharedByMe} variant="by-me" />
          </section>
        </div>
      )}

      {searchQuery && !loading && filteredFiles.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          <XCircle className="h-5 w-5 text-zinc-500" />
          No shared files match the current search.
        </div>
      ) : null}
    </motion.div>
  );
}

export default function SharedPage() {
  return (
    <ProtectedRoute>
      <SharedContent />
    </ProtectedRoute>
  );
}
