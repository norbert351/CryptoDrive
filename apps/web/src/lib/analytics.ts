'use client';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function isInitialized(): boolean {
  return typeof window !== 'undefined' && !!GA_MEASUREMENT_ID && typeof window.gtag === 'function';
}

function hashWallet(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function trackPageView(url: string): void {
  if (!isInitialized()) return;
  try {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  } catch {
    // gtag not available
  }
}

export function trackEvent(action: string, params?: Record<string, string | number | boolean>): void {
  if (!isInitialized()) return;
  try {
    window.gtag('event', action, params);
  } catch {
    // gtag not available
  }
}

export function identifyUser(walletAddress: string): void {
  if (!isInitialized()) return;
  try {
    window.gtag('set', 'user_properties', {
      wallet_address: hashWallet(walletAddress),
    });
  } catch {
    // gtag not available
  }
}

export function trackUpload(fileName: string, fileSize: number): void {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'unknown';
  trackEvent('file_upload', {
    file_name: fileName,
    file_size: fileSize,
    file_type: ext,
  });
}

export function trackDownload(fileName: string): void {
  trackEvent('file_download', {
    file_name: fileName,
  });
}

export function trackWalletConnect(walletAddress: string): void {
  trackEvent('wallet_connected', {
    wallet_address: hashWallet(walletAddress),
  });
}

export function trackLogin(walletAddress: string): void {
  trackEvent('login_success', {
    wallet_address: hashWallet(walletAddress),
  });
}
