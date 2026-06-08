'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletReadyState } from '@aptos-labs/wallet-adapter-core';
import { Network } from '@aptos-labs/ts-sdk';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connected, wallets, connect, disconnect, network, account, changeNetwork } = useWallet();
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  useEffect(() => {
    if (connected && network) {
      setIsWrongNetwork(network.name !== Network.TESTNET);
    } else {
      setIsWrongNetwork(false);
    }
  }, [connected, network]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl glass-card"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Connect Wallet</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {connected ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-zinc-400">Connected as</p>
                  <p className="font-mono text-lg font-medium text-white text-glow">
                    {account?.address.toString().slice(0, 6)}...
                    {account?.address.toString().slice(-4)}
                  </p>
                </div>
                
                {isWrongNetwork && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-950/50 border border-amber-900/50 p-3 text-amber-500 text-sm">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p>You are on the wrong network. Please switch to Aptos Testnet.</p>
                  </div>
                )}

                <p className="rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400">
                  Current:{' '}
                  <span className="font-medium text-zinc-200">
                    {network?.name ?? 'unknown'}
                  </span>
                  {network ? (
                    <span className="text-zinc-500"> · chain {network.chainId}</span>
                  ) : null}
                </p>

                {isWrongNetwork ? (
                  <button
                    type="button"
                    onClick={() => void changeNetwork(Network.TESTNET)}
                    className="w-full rounded-xl border border-amber-700/60 bg-amber-600/10 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-600/20"
                  >
                    Switch to Testnet
                  </button>
                ) : null}

                <button
                  onClick={() => disconnect()}
                  className="mt-4 w-full rounded-xl bg-zinc-800 py-3 font-medium text-white transition-all hover:bg-zinc-700 active:scale-95"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => connect(wallet.name)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-800 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(22,163,74,0.1)] active:scale-[0.98]",
                        wallet.readyState === WalletReadyState.Installed
                          ? 'opacity-100'
                          : 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-zinc-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={wallet.icon} 
                            alt={`${wallet.name} icon`} 
                            className="h-6 w-6 object-contain"
                          />
                        </div>
                        <span className="font-medium text-zinc-100">{wallet.name}</span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {wallet.readyState === WalletReadyState.Installed
                          ? 'Connect'
                          : 'Install'}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-zinc-400 py-8">
                    No Aptos wallets were detected in this browser.
                  </p>
                )}
              </div>
            )}
            
            {!connected && (
              <div className="mt-6 text-center text-xs text-zinc-500">
                By connecting a wallet, you agree to CryptoDrive&apos;s Terms of Service and Privacy Policy.
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
