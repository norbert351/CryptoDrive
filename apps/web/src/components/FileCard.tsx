import { motion } from 'framer-motion';
import { FileIcon, ImageIcon, FileTextIcon, MusicIcon, VideoIcon, Download, Share2, Star, Lock, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FileRow = {
  id: string;
  filename: string;
  blobName: string;
  ownerAddress: string;
  size: number;
  mimeType: string | null;
  iv: string | null;
  encryptedDek: string | null;
  createdAt: string;
};

interface FileCardProps {
  file: FileRow;
  viewMode: 'grid' | 'list';
  onDownload: (file: FileRow) => void;
  isDownloading: boolean;
  downloadProgress: string | null;
}

const DOWNLOAD_LABELS: Record<string, string> = {
  'checking-access': 'Checking access...',
  'fetching-metadata': 'Fetching metadata...',
  downloading: 'Downloading from Shelby...',
  decrypting: 'Decrypting...',
  saving: 'Saving file...',
  completed: 'Completed',
};

export function FileCard({ file, viewMode, onDownload, isDownloading, downloadProgress }: FileCardProps) {
  const isEncrypted = !!(file.iv && file.encryptedDek);
  const progressLabel = downloadProgress ? DOWNLOAD_LABELS[downloadProgress] ?? 'Downloading...' : null;

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon className="h-8 w-8 text-emerald-400/80" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-400/80" />;
    if (mimeType.startsWith('video/')) return <VideoIcon className="h-8 w-8 text-purple-400/80" />;
    if (mimeType.startsWith('audio/')) return <MusicIcon className="h-8 w-8 text-yellow-400/80" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileTextIcon className="h-8 w-8 text-red-400/80" />;
    return <FileIcon className="h-8 w-8 text-emerald-400/80" />;
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01 }}
        className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all hover:bg-zinc-800/60 hover:border-zinc-700 hover:shadow-md"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
            {getFileIcon(file.mimeType)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-white group-hover:text-emerald-400 transition-colors">
                {file.filename}
              </p>
              {isEncrypted && <Lock className="h-3 w-3 text-emerald-500" />}
            </div>
            <p className="font-mono text-xs text-zinc-500 mt-1">
              {formatSize(file.size)}
              {' · '}
              {new Date(file.createdAt).toLocaleDateString()}
            </p>
            <p className="font-mono text-[11px] text-zinc-600 mt-0.5">
              Owner: {file.ownerAddress.slice(0, 6)}...{file.ownerAddress.slice(-4)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
            <Star className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDownload(file)}
            disabled={isDownloading}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              isDownloading
                ? "bg-zinc-800 text-emerald-500 cursor-not-allowed"
                : "bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white"
            )}
          >
            {isDownloading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {progressLabel ?? (isDownloading ? 'Downloading...' : 'Download')}
            </span>
          </button>
        </div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 glass-card transition-all hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(22,163,74,0.1)]"
    >
      <div className="flex h-40 w-full items-center justify-center bg-zinc-950/50 p-6 relative">
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="rounded-md bg-zinc-900/80 p-1.5 text-zinc-400 hover:text-white backdrop-blur-md">
            <Star className="h-4 w-4" />
          </button>
          <button className="rounded-md bg-zinc-900/80 p-1.5 text-zinc-400 hover:text-white backdrop-blur-md">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <motion.div
          className="relative drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {getFileIcon(file.mimeType)}
          {isEncrypted && (
            <div className="absolute -bottom-2 -right-2 rounded-full bg-zinc-900 p-1 shadow-lg border border-zinc-800">
              <Lock className="h-3 w-3 text-emerald-500" />
            </div>
          )}
        </motion.div>
        {isDownloading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col items-center gap-2">
              <Loader className="h-8 w-8 animate-spin text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">
                {progressLabel ?? 'Downloading...'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 border-t border-zinc-800">
        <h4 className="truncate text-sm font-medium text-white group-hover:text-emerald-400 transition-colors" title={file.filename}>
          {file.filename}
        </h4>
        <div className="mt-1 flex items-center justify-between font-mono text-xs text-zinc-500">
          <span>{formatSize(file.size)}</span>
          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-zinc-600">
          {file.ownerAddress.slice(0, 6)}...{file.ownerAddress.slice(-4)}
        </p>

        <div className="mt-4 pt-3 border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur p-3 transform translate-y-full group-hover:translate-y-0 duration-300 ease-out">
          <button
            onClick={() => onDownload(file)}
            disabled={isDownloading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {progressLabel ?? (isDownloading ? 'Downloading...' : 'Download')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
