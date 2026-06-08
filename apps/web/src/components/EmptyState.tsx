import { motion } from 'framer-motion';
import { CloudUpload, FolderPlus } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="relative flex min-h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/20 p-8 glass-card">
      {/* Animated Glow Background */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 z-0 flex items-center justify-center"
      >
        <div className="h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 shadow-xl shadow-black/50 border border-zinc-800"
        >
          <CloudUpload className="h-10 w-10 text-emerald-400" />
        </motion.div>

        <motion.h3
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-2 text-2xl font-semibold tracking-tight text-white"
        >
          Your decentralized vault is empty
        </motion.h3>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 max-w-md text-zinc-400"
        >
          Upload encrypted files securely on Shelby Protocol. Your data remains private and entirely under your control.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Link
            href="/upload"
            className="group flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
          >
            <CloudUpload className="h-5 w-5 transition-transform group-hover:-translate-y-1" />
            Upload File
          </Link>
          <button
            type="button"
            className="group flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-6 py-3 font-medium text-zinc-200 backdrop-blur transition-all hover:bg-zinc-700 hover:text-white active:scale-95"
          >
            <FolderPlus className="h-5 w-5 text-zinc-400 group-hover:text-zinc-300" />
            Create Folder
          </button>
        </motion.div>
      </div>
    </div>
  );
}
