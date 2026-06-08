'use client';

import Link from 'next/link';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { ArrowRight, CheckCircle2, HardDrive, LockKeyhole, Share2, Sparkles, ShieldCheck, UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWalletModal } from '@/components/WalletModalProvider';

const features = [
  {
    title: 'End-to-end encryption',
    description: 'Files are encrypted in the browser before anything leaves the device.',
    icon: LockKeyhole,
  },
  {
    title: 'Decentralized storage',
    description: 'Shelby handles durable blob storage while ownership stays tied to your wallet.',
    icon: ShieldCheck,
  },
  {
    title: 'Fast downloads',
    description: 'Access encrypted files quickly with a minimal, direct retrieval flow.',
    icon: Sparkles,
  },
  {
    title: 'Wallet ownership',
    description: 'Every upload is authenticated and scoped to a connected Aptos address.',
    icon: HardDrive,
  },
  {
    title: 'File sharing',
    description: 'Prepare shareable views and links without breaking the vault model.',
    icon: Share2,
  },
];

const steps = [
  { title: 'Upload', description: 'Pick a file from the dashboard or upload page.' },
  { title: 'Encrypt', description: 'Your wallet authorizes local key derivation.' },
  { title: 'Store on Shelby', description: 'The encrypted blob is registered and stored on Shelby.' },
];

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      <p className="mt-2 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

export default function LandingPage() {
  const { connected, account } = useWallet();
  const { openWalletModal } = useWalletModal();

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,_rgba(16,185,129,0.22),_rgba(3,7,18,0)_35%,_rgba(20,184,166,0.12)_72%,_rgba(3,7,18,0))]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(16,185,129,0.06)_1px,_transparent_1px),linear-gradient(90deg,_rgba(16,185,129,0.05)_1px,_transparent_1px)] bg-[size:64px_64px] opacity-60" />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Aptos Testnet + Shelby
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Encrypted Decentralized Storage Built on Shelby
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              Store, share, and access files securely using Aptos and Shelby Protocol.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openWalletModal({ redirectOnConnect: true })}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                <UploadCloud className="h-4 w-4" />
                Connect Wallet
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/40 hover:text-white"
              >
                Explore Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <MiniCard title="Network" value="Aptos Testnet" />
              <MiniCard title="Storage" value="Encrypted on Shelby" />
              <MiniCard title="Ownership" value="Wallet-based access" />
            </div>
          </div>

          <div className="relative">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative mx-auto max-w-md"
            >
              <div className="absolute -left-4 top-10 h-28 w-28 rounded-2xl border border-emerald-500/20 bg-zinc-950/80 p-4 shadow-2xl shadow-black/50 backdrop-blur">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Secure upload
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2 rounded-full bg-emerald-500/30" />
                  <div className="h-2 w-4/5 rounded-full bg-zinc-700" />
                  <div className="h-2 w-3/5 rounded-full bg-zinc-800" />
                </div>
              </div>

              <div className="relative rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Vault preview</p>
                    <p className="mt-1 text-lg font-semibold text-white">CryptoDrive</p>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                    Live
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                          <HardDrive className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Encrypted Vault</p>
                          <p className="text-xs text-zinc-500">4.8 GB stored</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                        Aptos
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-xs text-zinc-500">Recent file</p>
                      <p className="mt-2 truncate text-sm text-white">taxes-2026.pdf</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-xs text-zinc-500">Shared</p>
                      <p className="mt-2 text-sm text-white">12 links active</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-2 bottom-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur">
                <p className="text-xs text-zinc-500">Connected</p>
                <p className="mt-1 font-mono text-sm text-white">
                  {connected && account ? `${account.address.toString().slice(0, 6)}...${account.address.toString().slice(-4)}` : 'Wallet required'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">Features</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Built for secure vault operations</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">How it works</p>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-sm font-semibold text-emerald-300">
                {index + 1}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-4 border-t border-zinc-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-white">CryptoDrive</span>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Aptos and Shelby badges
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300">Aptos</span>
          <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300">Shelby</span>
          <a href="#" className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 transition hover:text-white">X</a>
          <a href="#" className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 transition hover:text-white">Discord</a>
          <a href="#" className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 transition hover:text-white">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
