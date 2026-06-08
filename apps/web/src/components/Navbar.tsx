'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';
import {
  Wallet,
  Settings,
  LayoutDashboard,
  UploadCloud,
  Users,
  HardDrive,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWalletModal } from './WalletModalProvider';

export function Navbar() {
  const { connected, account, network, isLoading } = useWallet();
  const { openWalletModal } = useWalletModal();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload', href: '/upload', icon: UploadCloud },
    { name: 'Shared', href: '/shared', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const address = account?.address.toString();
  const isWrongNetwork = connected && network && network.name !== Network.TESTNET;
  const isActiveRoute = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/50 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 md:gap-8">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition hover:border-emerald-500/40 hover:text-white md:hidden"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-400 transition-colors group-hover:bg-emerald-500/25">
              <HardDrive className="h-5 w-5" />
            </div>
            <span className="truncate bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              CryptoDrive
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = isActiveRoute(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-zinc-800 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                  )}
                >
                  <link.icon className={cn('h-4 w-4', isActive ? 'text-emerald-500' : '')} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => openWalletModal({ redirectOnConnect: !connected })}
          className={cn(
            'flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
            connected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.14)] hover:bg-emerald-500/15'
              : 'border-zinc-700 bg-zinc-800 text-white shadow-md hover:border-zinc-600 hover:bg-zinc-700',
            isWrongNetwork && 'border-amber-500/50 bg-amber-500/10 text-amber-300',
          )}
        >
          <Wallet className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">
            {isLoading
              ? 'Checking Wallet'
              : address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : 'Connect Wallet'}
          </span>
          <span className="sm:hidden">{connected ? 'Wallet' : 'Connect'}</span>
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-zinc-800/60 bg-zinc-950/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <nav className="mx-auto grid max-w-6xl gap-1">
            {navLinks.map((link) => {
              const isActive = isActiveRoute(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
