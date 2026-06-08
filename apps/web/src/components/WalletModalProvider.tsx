'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Network } from '@aptos-labs/ts-sdk';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletModal } from './WalletModal';

type OpenWalletOptions = {
  redirectOnConnect?: boolean;
};

type WalletModalContextValue = {
  isWalletModalOpen: boolean;
  openWalletModal: (options?: OpenWalletOptions) => void;
  closeWalletModal: () => void;
};

const WalletModalContext = createContext<WalletModalContextValue | null>(null);

export function WalletModalProvider({ children }: PropsWithChildren) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [redirectOnConnect, setRedirectOnConnect] = useState(false);
  const { connected, account, network } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  const openWalletModal = useCallback((options?: OpenWalletOptions) => {
    setRedirectOnConnect(Boolean(options?.redirectOnConnect));
    setIsWalletModalOpen(true);
  }, []);

  const closeWalletModal = useCallback(() => {
    setIsWalletModalOpen(false);
    setRedirectOnConnect(false);
  }, []);

  useEffect(() => {
    if (
      !redirectOnConnect ||
      !connected ||
      !account ||
      network?.name !== Network.TESTNET
    ) {
      return;
    }

    setRedirectOnConnect(false);
    setIsWalletModalOpen(false);

    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  }, [account, connected, network, pathname, redirectOnConnect, router]);

  const value = useMemo(
    () => ({
      isWalletModalOpen,
      openWalletModal,
      closeWalletModal,
    }),
    [closeWalletModal, isWalletModalOpen, openWalletModal],
  );

  return (
    <WalletModalContext.Provider value={value}>
      {children}
      <WalletModal isOpen={isWalletModalOpen} onClose={closeWalletModal} />
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  const context = useContext(WalletModalContext);
  if (!context) {
    throw new Error('useWalletModal must be used within WalletModalProvider');
  }
  return context;
}
