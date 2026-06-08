'use client';

declare global {
  interface Window {
    clarity: ((...args: unknown[]) => void) | undefined;
  }
}

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

function isInitialized(): boolean {
  return typeof window !== 'undefined' && !!CLARITY_PROJECT_ID && typeof window.clarity === 'function';
}

export function identifyUser(userId: string): void {
  if (!isInitialized()) return;
  try {
    window.clarity?.('identify', userId);
  } catch {
    // clarity not available
  }
}

export function setTag(key: string, value: string): void {
  if (!isInitialized()) return;
  try {
    window.clarity?.('set', key, value);
  } catch {
    // clarity not available
  }
}

export function trackClarityEvent(eventName: string): void {
  if (!isInitialized()) return;
  try {
    window.clarity?.('event', eventName);
  } catch {
    // clarity not available
  }
}
