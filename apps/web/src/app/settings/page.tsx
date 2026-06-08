'use client';

import type { ComponentType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Network } from '@aptos-labs/ts-sdk';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import {
  Bell,
  CheckCircle2,
  HardDrive,
  KeyRound,
  Laptop,
  Moon,
  PlugZap,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useWalletModal } from '@/components/WalletModalProvider';
import { cn } from '@/lib/utils';

function shortenAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function SettingCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={enabled}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition',
          enabled
            ? 'border-emerald-500/40 bg-emerald-500/30'
            : 'border-zinc-700 bg-zinc-800',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
            enabled ? 'left-5' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

function SettingsContent() {
  const { connected, account, network, disconnect, changeNetwork } = useWallet();
  const { openWalletModal } = useWalletModal();
  const address = account?.address.toString();
  const isTestnet = network?.name === Network.TESTNET;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <section className="glass-card rounded-2xl p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
          Account controls
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Manage wallet access, local encryption preferences, and storage status for CryptoDrive.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingCard
          title="Wallet"
          description="Connected wallet, network status, and session controls."
          icon={Wallet}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Connected wallet
              </p>
              <p className="mt-2 break-all font-mono text-sm text-white">
                {connected && address ? shortenAddress(address) : 'Not connected'}
              </p>
              {address ? (
                <p className="mt-1 break-all font-mono text-xs text-zinc-600">{address}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                  isTestnet
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                )}
              >
                <PlugZap className="h-3.5 w-3.5" />
                {network?.name ?? 'Unknown network'}
              </span>
              {!isTestnet ? (
                <button
                  type="button"
                  onClick={() => void changeNetwork(Network.TESTNET)}
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  Switch to Testnet
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openWalletModal()}
                className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/40 hover:text-white"
              >
                Manage wallet
              </button>
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        </SettingCard>

        <SettingCard
          title="Security"
          description="Encryption and device management state."
          icon={ShieldCheck}
        >
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-sm font-medium text-emerald-100">Encryption enabled</p>
                  <p className="text-xs text-emerald-200/70">AES-GCM before upload</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">Session devices</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Device and session management placeholders will appear here.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">Key derivation</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Wallet signatures derive local wrap keys without sending keys to servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SettingCard>

        <SettingCard
          title="Storage"
          description="Vault usage and Shelby network indicators."
          icon={HardDrive}
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Storage usage</span>
                <span className="font-medium text-zinc-200">4.8 GB / 25 GB</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[19%] rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Uploaded files
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">0</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">
                  Shelby status
                </p>
                <p className="mt-2 text-sm font-medium text-emerald-100">Testnet ready</p>
              </div>
            </div>
          </div>
        </SettingCard>

        <SettingCard
          title="Preferences"
          description="Local interface and notification preferences."
          icon={Moon}
        >
          <div className="grid gap-3">
            <ToggleRow
              label="Dark theme"
              description="CryptoDrive currently uses the dark green interface."
              enabled
            />
            <ToggleRow
              label="Storage notifications"
              description="Notify when uploads complete or shared access changes."
              enabled={false}
            />
            <ToggleRow
              label="Wallet activity alerts"
              description="Placeholder for wallet and network activity notifications."
              enabled={false}
            />
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
              <Bell className="h-5 w-5 text-zinc-400" />
              Preferences are local UI placeholders until backend settings are added.
            </div>
          </div>
        </SettingCard>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
