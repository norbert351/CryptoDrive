'use client';

import { Star } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function StarredContent() {
  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="flex items-center gap-2 text-yellow-400">
        <Star className="h-5 w-5" />
        <h1 className="text-lg font-semibold text-white">Starred</h1>
      </div>
      <p className="mt-3 text-sm text-zinc-400">Starred files will appear here.</p>
    </div>
  );
}

export default function StarredPage() {
  return (
    <ProtectedRoute>
      <StarredContent />
    </ProtectedRoute>
  );
}
