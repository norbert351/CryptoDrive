'use client';

import Clarity from '@microsoft/clarity';

const PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
let initialised = false;

export function initClarity(): void {
  if (initialised) return;
  if (typeof window === 'undefined') return;
  if (!PROJECT_ID) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Clarity] Missing NEXT_PUBLIC_CLARITY_PROJECT_ID');
    }
    return;
  }
  try {
    Clarity.init(PROJECT_ID);
    initialised = true;
    setTag('environment', process.env.NODE_ENV ?? 'production');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Clarity] Failed to initialize:', error);
    }
  }
}

export interface IdentifyUserParams {
  id: string;
  sessionId?: string;
  pageId?: string;
  friendlyName?: string;
}

export function identifyUser(params: IdentifyUserParams): void {
  if (!initialised) return;
  try {
    Clarity.identify(
      params.id,
      params.sessionId,
      params.pageId,
      params.friendlyName,
    );
  } catch {
    // fail silently
  }
}

export function trackEvent(eventName: string): void {
  if (!initialised) return;
  try {
    Clarity.event(eventName);
  } catch {
    // fail silently
  }
}

export function setTag(key: string, value: string): void {
  if (!initialised) return;
  try {
    Clarity.setTag(key, value);
  } catch {
    // fail silently
  }
}

export function upgradeSession(reason: string): void {
  if (!initialised) return;
  try {
    Clarity.upgrade(reason);
  } catch {
    // fail silently
  }
}
