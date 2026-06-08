'use client';

/**
 * CryptoDrive – Client-side AES-256-GCM encryption utilities.
 *
 * Encryption model:
 *  1. Each file gets a unique random AES-256-GCM DEK (Data Encryption Key).
 *  2. The DEK is wrapped with a master "wrap key" derived from the wallet
 *     signature via HKDF-SHA-256, making decryption non-custodial.
 *  3. The 12-byte IV and wrapped DEK are stored in the database.
 *  4. The encrypted ciphertext is stored on Shelby. The server never sees
 *     plaintext.
 *
 * Key derivation:
 *  - User signs a static deterministic message with their Aptos wallet.
 *  - The Ed25519 signature bytes are used as HKDF input material.
 *  - Ed25519 is deterministic: same (key, message) always gives same signature.
 *  - The derived wrap key is cached in memory for the session.
 */

import { Hex } from '@aptos-labs/ts-sdk';
import type { useWallet } from '@aptos-labs/wallet-adapter-react';

type Wallet = ReturnType<typeof useWallet>;

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Static message signed by the wallet to derive the wrap key.
 * MUST NOT change — changing it makes all existing files undecryptable.
 */
export const WRAP_KEY_MSG = 'CryptoDrive encryption key derivation v1';
export const WRAP_KEY_NONCE = 'cryptodrive-kdf-v1';

const HKDF_INFO = new TextEncoder().encode('cryptodrive-wrap-key-v1');
const HKDF_SALT = new Uint8Array(32); // static zero salt

// ── Wrap-key cache (in-memory, per wallet address) ──────────────────────────

const wrapKeyCache = new Map<string, CryptoKey>();

export function clearWrapKeyCache(address?: string) {
  if (address) wrapKeyCache.delete(address);
  else wrapKeyCache.clear();
}

/**
 * Derives (and caches) the AES-KW wrap key for a wallet address.
 * Triggers a wallet signature popup the first time (cached thereafter).
 */
export async function deriveWrapKeyFromWallet(wallet: Wallet): Promise<CryptoKey> {
  const { account, signMessage } = wallet;
  if (!account) throw new Error('Connect your wallet first');

  const address = account.address.toString();
  const cached = wrapKeyCache.get(address);
  if (cached) return cached;

  const signed = await signMessage({ message: WRAP_KEY_MSG, nonce: WRAP_KEY_NONCE });

  const sigU8 = Hex.fromHexInput(signed.signature.toUint8Array()).toUint8Array();
  const keyMaterial = sigU8.buffer.slice(
    sigU8.byteOffset,
    sigU8.byteOffset + sigU8.byteLength,
  ) as ArrayBuffer;

  const hkdfKey = await crypto.subtle.importKey('raw', keyMaterial, { name: 'HKDF' }, false, [
    'deriveKey',
  ]);

  const wrapKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: HKDF_INFO },
    hkdfKey,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );

  wrapKeyCache.set(address, wrapKey);
  return wrapKey;
}

// ── DEK generation / wrap / unwrap ──────────────────────────────────────────

/** Generates a fresh random AES-256-GCM Data Encryption Key. */
export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

/** Wraps the DEK with the wrap key (AES-KW). Returns base64. */
export async function wrapDek(dek: CryptoKey, wrapKey: CryptoKey): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', dek, wrapKey, 'AES-KW');
  return bufToBase64(wrapped);
}

/** Unwraps the DEK from its base64 encrypted form using the wrap key. */
export async function unwrapDek(encryptedDekB64: string, wrapKey: CryptoKey): Promise<CryptoKey> {
  const wrapped = base64ToBuf(encryptedDekB64);
  return crypto.subtle.unwrapKey('raw', wrapped, wrapKey, 'AES-KW', { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}

// ── File encrypt / decrypt ──────────────────────────────────────────────────

/**
 * Encrypts a File with AES-256-GCM.
 * @returns `ciphertext` (encrypted bytes) and `iv` (12-byte nonce).
 */
export async function encryptFile(
  dek: CryptoKey,
  file: File,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, plaintext);
  return { ciphertext: new Uint8Array(encrypted), iv };
}

/**
 * Decrypts AES-256-GCM ciphertext back to the original plaintext.
 */
export async function decryptBytes(
  dek: CryptoKey,
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  const ivCopy = new Uint8Array(iv.length);
  ivCopy.set(iv);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivCopy }, dek, ciphertext);
}

// ── Encoding helpers ─────────────────────────────────────────────────────────

export function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuf(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
