'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UploadCloud, ScanLine, FolderPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const actions = [
    {
      name: 'Upload',
      icon: UploadCloud,
      onClick: () => router.push('/upload'),
      color: 'bg-emerald-600 hover:bg-emerald-500',
    },
    {
      name: 'Scan',
      icon: ScanLine,
      onClick: () => {},
      color: 'bg-teal-600 hover:bg-teal-500',
    },
    {
      name: 'Folder',
      icon: FolderPlus,
      onClick: () => {},
      color: 'bg-lime-600 hover:bg-lime-500',
    },
  ];

  return (
    <div className="fixed bottom-20 right-6 z-40 md:bottom-8 md:right-8 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="mb-4 flex flex-col items-end gap-3"
          >
            {actions.map((action, i) => (
              <motion.button
                key={action.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: (actions.length - 1 - i) * 0.05 }}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className="group flex items-center gap-3 rounded-full"
              >
                <span className="rounded-md bg-zinc-800/90 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur">
                  {action.name}
                </span>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-110", action.color)}>
                  <action.icon className="h-5 w-5" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-all hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95",
          isOpen ? "rotate-45" : "rotate-0"
        )}
      >
        <Plus className="h-6 w-6" />
        <div className="absolute inset-0 -z-10 rounded-full bg-emerald-500 blur-md opacity-40 animate-pulse"></div>
      </button>
    </div>
  );
}
