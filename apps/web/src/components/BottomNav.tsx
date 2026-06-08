'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, UploadCloud, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload', href: '/upload', icon: UploadCloud },
    { name: 'Shared', href: '/shared', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden pb-safe">
      <div className="glass border-t border-zinc-800/50 bg-zinc-950/80">
        <div className="flex justify-around items-center h-16 px-4">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center p-1.5 rounded-xl transition-all",
                  isActive ? "bg-emerald-500/10 text-emerald-400" : ""
                )}>
                  <link.icon className={cn("h-5 w-5", isActive ? "fill-emerald-400/20" : "")} />
                </div>
                <span className="text-[10px] font-medium">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
