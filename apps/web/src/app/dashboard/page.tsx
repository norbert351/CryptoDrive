'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { apiFetch, getAccessToken, setAccessToken, clearAccessToken } from '@/lib/api';
import { loginWithWallet } from '@/lib/auth-wallet';
import {
  deriveWrapKeyFromWallet,
  unwrapDek,
  decryptBytes,
  hexToBuf,
  clearWrapKeyCache,
} from '@/lib/crypto';

import { EmptyState } from '@/components/EmptyState';
import { DashboardStats } from '@/components/DashboardStats';
import { FileGrid } from '@/components/FileGrid';
import { FloatingMenu } from '@/components/FloatingMenu';
import { FileRow } from '@/components/FileCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Grid,
  List,
  RefreshCw,
  Sparkles,
  FolderOpen,
  Share2,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const wallet = useWallet();
  const { connected, account } = wallet;

  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState<'all' | 'encrypted' | 'docs'>('all');
  const [sortValue, setSortValue] = useState<'newest' | 'oldest' | 'name'>('newest');

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  // ── Auth helpers ──────────────────────────────────────────────────────────

  const ensureSession = useCallback(async () => {
    if (!connected || !account) return null;
    let token = getAccessToken();
    if (!token) {
      setAuthBusy(true);
      try {
        token = await loginWithWallet(wallet, apiBase);
        setAccessToken(token);
      } finally {
        setAuthBusy(false);
      }
    }
    return token;
  }, [account, apiBase, connected, wallet]);

  // ── File list ─────────────────────────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    if (!account) return;
    setError(null);
    try {
      await ensureSession();
      const rows = (await apiFetch(
        `/files?owner=${encodeURIComponent(account.address.toString())}`,
      )) as FileRow[];
      setFiles(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files');
      clearAccessToken();
      setFiles([]);
    }
  }, [account, ensureSession]);

  useEffect(() => {
    if (connected && account) void loadFiles();
    else {
      setFiles(null);
      clearAccessToken();
      clearWrapKeyCache();
    }
  }, [account, connected, loadFiles]);

  const filteredFiles = useMemo(() => {
    const base = files ?? [];
    const search = base.filter((f) =>
      f.filename.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const byFilter = search.filter((f) => {
      if (filterValue === 'all') return true;
      if (filterValue === 'encrypted') return Boolean(f.iv && f.encryptedDek);
      if (filterValue === 'docs') {
        const mime = f.mimeType?.toLowerCase() ?? '';
        return mime.includes('pdf') || mime.includes('text') || mime.includes('document');
      }
      return true;
    });
    return [...byFilter].sort((a, b) => {
      if (sortValue === 'name') return a.filename.localeCompare(b.filename);
      if (sortValue === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [files, filterValue, searchQuery, sortValue]);

  const totalSize = files?.reduce((acc, f) => acc + f.size, 0) ?? 0;
  const recentUploads = filteredFiles.slice(0, 4);
  const sharedFiles = filteredFiles.filter((f) => f.blobName.toLowerCase().includes('shared'));

  // ── Download + decrypt ────────────────────────────────────────────────────

  type DownloadStep =
    | 'checking-access'
    | 'fetching-metadata'
    | 'downloading'
    | 'decrypting'
    | 'saving'
    | 'completed';

  const DOWNLOAD_LABELS: Record<DownloadStep, string> = {
    'checking-access': 'Checking access...',
    'fetching-metadata': 'Fetching metadata...',
    downloading: 'Downloading from Shelby...',
    decrypting: 'Decrypting...',
    saving: 'Saving file...',
    completed: 'Completed',
  };

  async function downloadFile(f: FileRow) {
    if (!connected || !account) {
      setError('Connect wallet first');
      return;
    }

    setDownloading(f.id);
    setDownloadProgress('checking-access');
    setError(null);

    try {
      await ensureSession();
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');

      setDownloadProgress('fetching-metadata');
      const response = await fetch(
        `${apiBase}/download/${encodeURIComponent(f.id)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 403) {
        throw new Error(
          'You do not have permission to download this file',
        );
      }
      if (!response.ok) {
        throw new Error('Download failed');
      }

      setDownloadProgress('downloading');
      const encryptedBlob = await response.arrayBuffer();

      let finalBuffer: ArrayBuffer;
      let mimeType = 'application/octet-stream';
      const fileName = f.filename;

      if (f.iv && f.encryptedDek) {
        setDownloadProgress('decrypting');
        const wrapKey = await deriveWrapKeyFromWallet(wallet);
        const dek = await unwrapDek(f.encryptedDek, wrapKey);
        const iv = hexToBuf(f.iv);
        finalBuffer = await decryptBytes(dek, encryptedBlob, iv);
        mimeType = f.mimeType ?? 'application/octet-stream';
      } else {
        finalBuffer = encryptedBlob;
      }

      setDownloadProgress('saving');
      const blob = new Blob([finalBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDownloadProgress('completed');
      setTimeout(() => {
        setDownloadProgress(null);
        setDownloading(null);
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Download failed';
      setError(msg);
      setDownloading(null);
      setDownloadProgress(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[12%] top-[-30px] h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[8%] top-[10%] h-72 w-72 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
            Personal vault
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Manage encrypted files owned by your Aptos wallet and stored through Shelby.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              <UploadCloud className="h-4 w-4" />
              Upload file
            </Link>
            <Link
              href="/shared"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:text-white"
            >
              <Share2 className="h-4 w-4" />
              Shared files
            </Link>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Upload area</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Encrypt locally, register on Aptos Testnet, and store the encrypted blob on Shelby.
          </p>
          <Link
            href="/upload"
            className="mt-5 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.04] text-sm font-medium text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/[0.07]"
          >
            Open encrypted upload
          </Link>
        </div>
      </section>

      <DashboardStats totalFiles={files?.length ?? 0} totalSize={totalSize} />

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">Dismiss</button>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 glass-card"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => void loadFiles()}
            disabled={authBusy}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 glass"
          >
            <RefreshCw className={cn("h-4 w-4", authBusy && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white glass">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>

          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value as typeof filterValue)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 outline-none transition hover:border-zinc-700"
          >
            <option value="all">All</option>
            <option value="encrypted">Encrypted</option>
            <option value="docs">Docs</option>
          </select>

          <select
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value as typeof sortValue)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 outline-none transition hover:border-zinc-700"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">A-Z</option>
          </select>

          <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/50 p-1 glass">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                viewMode === 'grid' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                viewMode === 'list' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── File list ──────────────────────────────────────────────────────── */}
      {!files ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500"></div>
          <p className="mt-4 text-zinc-500">Decrypting metadata...</p>
        </div>
      ) : files.length === 0 ? (
        <EmptyState />
      ) : (
        <FileGrid
          files={filteredFiles}
          viewMode={viewMode}
          onDownload={downloadFile}
          downloadingId={downloading}
          downloadProgress={downloadProgress}
        />
      )}

      {/* ── Dashboard sections ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-4 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Recent uploads</h3>
            <span className="text-xs text-zinc-500">{recentUploads.length} shown</span>
          </div>
          {recentUploads.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent uploads yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentUploads.map((f) => (
                <li
                  key={`recent-${f.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{f.filename}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(f.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadFile(f)}
                    className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-200">Shared files</h3>
            <p className="text-2xl font-semibold text-white">{sharedFiles.length}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {sharedFiles.length ? 'Shared from this vault' : 'No active shares yet'}
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">Quick actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <button className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-2 py-3 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300">
                <FolderOpen className="mx-auto h-4 w-4" />
              </button>
              <button className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-2 py-3 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300">
                <Share2 className="mx-auto h-4 w-4" />
              </button>
              <button className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-2 py-3 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300">
                <Sparkles className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Note ───────────────────────────────────────────────────────────── */}
      {files && files.some((f) => f.iv) && (
        <p className="text-center text-xs text-zinc-600 mt-8">
          🔒 Downloads require a wallet signature to derive your decryption key.
          The key is never sent to any server.
        </p>
      )}

      {/* ── Floating Action Button ─────────────────────────────────────────── */}
      <FloatingMenu />
      </motion.div>
    </ProtectedRoute>
  );
}
