import { motion, AnimatePresence } from 'framer-motion';
import { FileCard, type FileRow } from './FileCard';
import { cn } from '@/lib/utils';

interface FileGridProps {
  files: FileRow[];
  viewMode: 'grid' | 'list';
  onDownload: (file: FileRow) => void;
  downloadingId: string | null;
  downloadProgress: string | null;
}

export function FileGrid({ files, viewMode, onDownload, downloadingId, downloadProgress }: FileGridProps) {
  return (
    <motion.div
      layout
      className={cn(
        "gap-4",
        viewMode === 'grid'
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          : "flex flex-col space-y-2"
      )}
    >
      <AnimatePresence mode="popLayout">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            viewMode={viewMode}
            onDownload={onDownload}
            isDownloading={downloadingId === file.id}
            downloadProgress={downloadingId === file.id ? downloadProgress : null}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
