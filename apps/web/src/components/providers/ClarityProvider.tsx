'use client';

import { useEffect, useRef, type PropsWithChildren } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { initClarity, identifyUser, setTag } from '@/lib/analytics/clarity';

export function ClarityProvider({ children }: PropsWithChildren) {
  const { connected, account } = useWallet();
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current) {
      initClarity();
      setTag('network', 'aptos');
      setTag('storage', 'shelby');
      initialised.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (connected && account) {
      const address = account.address.toString();
      identifyUser({
        id: address,
        friendlyName: address.slice(0, 8),
      });
      setTag('wallet', address);
    } else if (!connected && initialised.current) {
      const sessionId = crypto.randomUUID();
      identifyUser({
        id: `guest_${sessionId}`,
        sessionId,
      });
    }
  }, [connected, account]);

  return <>{children}</>;
}
