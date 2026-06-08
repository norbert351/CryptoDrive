'use client';

import Link from 'next/link';
import { Folder } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function FilesContent() {
  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="flex items-center gap-2 text-emerald-400">
        <Folder className="h-5 w-5" />
        <h1 className="text-lg font-semibold text-white">Files</h1>
      </div>
      <p className="mt-3 text-sm text-zinc-400">
        Browse your main vault from <Link href="/dashboard" className="text-emerald-400">Dashboard</Link>.
      </p>
    </div>
  );
}

export default function FilesPage() {
  return (
    <ProtectedRoute>
      <FilesContent />
    </ProtectedRoute>
  );
}
