'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { Network } from '@aptos-labs/ts-sdk';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { connected, account, isLoading, network, changeNetwork } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!connected || !account)) {
      router.replace('/');
    }
  }, [account, connected, isLoading, router]);

  if (isLoading || !connected || !account) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-sm font-medium text-zinc-300">Checking wallet connection</p>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          Redirecting to the homepage if no wallet is connected.
        </p>
      </div>
    );
  }

  if (!network) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-zinc-300">Reading wallet network</p>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          CryptoDrive runs on Aptos Testnet.
        </p>
      </div>
    );
  }

  if (network.name !== Network.TESTNET) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-white">Aptos Testnet required</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          This app only supports Aptos Testnet. Your wallet is currently on{' '}
          <span className="font-medium text-amber-300">{network.name}</span>.
        </p>
        <button
          type="button"
          onClick={() => void changeNetwork(Network.TESTNET)}
          className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
        >
          Switch to Aptos Testnet
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
