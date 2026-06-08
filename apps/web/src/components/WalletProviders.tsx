'use client';

import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';
import type { PropsWithChildren } from 'react';

const testnetKey = process.env.NEXT_PUBLIC_APTOS_API_KEY;

export function WalletProviders({ children }: PropsWithChildren) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        aptosApiKeys: testnetKey
          ? {
              testnet: testnetKey,
            }
          : undefined,
      }}
      onError={(error) => {
        console.error('Wallet Error:', error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
