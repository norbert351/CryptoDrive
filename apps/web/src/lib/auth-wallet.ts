'use client';

import { Hex } from '@aptos-labs/ts-sdk';
import type { useWallet } from '@aptos-labs/wallet-adapter-react';

type Wallet = ReturnType<typeof useWallet>;

/**
 * Signs a server nonce and exchanges it for a JWT. Uses wallet-standard signMessage output.
 */
export async function loginWithWallet(
  wallet: Wallet,
  apiUrl: string,
): Promise<string> {
  const { account, signMessage } = wallet;
  if (!account) throw new Error('Connect wallet first');

  const chRes = await fetch(`${apiUrl}/auth/challenge`);
  if (!chRes.ok) throw new Error('challenge failed');
  const { nonce } = (await chRes.json()) as { nonce: string };

  const message = `CryptoDrive login\nnonce:${nonce}`;
  const signed = await signMessage({
    message,
    nonce,
  });

  const publicKeyHex = Hex.fromHexInput(account.publicKey.toUint8Array())
    .toString()
    .replace(/^0x/i, '');

  const signatureHex = Hex.fromHexInput(signed.signature.toUint8Array())
    .toString()
    .replace(/^0x/i, '');

  const verifyRes = await fetch(`${apiUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: account.address.toString(),
      fullMessage: signed.fullMessage,
      publicKeyHex,
      signatureHex,
      nonce,
    }),
  });
  if (!verifyRes.ok) {
    const t = await verifyRes.text();
    throw new Error(t || 'verify failed');
  }
  const { accessToken } = (await verifyRes.json()) as { accessToken: string };
  return accessToken;
}
