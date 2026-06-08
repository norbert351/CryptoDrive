const base = () =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type SharedFile = {
  id: string;
  filename: string;
  size: number;
  mimeType: string | null;
  ownerAddress: string;
  sharedBy: string;
  sharedWith: string;
  createdAt: string;
  direction?: 'with-me' | 'by-me';
};

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('cryptodrive_token');
}

export function setAccessToken(token: string) {
  window.localStorage.setItem('cryptodrive_token', token);
}

export function clearAccessToken() {
  window.localStorage.removeItem('cryptodrive_token');
}

export async function apiFetch(
  path: string,
  init: RequestInit & { auth?: boolean; timeoutMs?: number } = {},
) {
  const { auth, timeoutMs, ...requestInit } = init;
  const headers = new Headers(init.headers);
  if (auth !== false) {
    const t = getAccessToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }

  const controller = timeoutMs ? new AbortController() : null;
  const timeout = timeoutMs
    ? setTimeout(() => controller?.abort(), timeoutMs)
    : null;

  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      ...requestInit,
      headers,
      signal: controller?.signal ?? requestInit.signal,
    });
  } catch (error) {
    if (timeoutMs && error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (!res.ok) {
    const ct = res.headers.get('content-type');
    if (ct?.includes('application/json')) {
      const body = await res.json().catch(() => null);
      const message = body?.message;
      if (Array.isArray(message)) throw new Error(message.join(', '));
      if (typeof message === 'string') throw new Error(message);
      if (body) throw new Error(JSON.stringify(body));
    }
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return res.json();
  return res;
}

export async function fetchSharedFiles(): Promise<SharedFile[]> {
  return (await apiFetch('/shared-files')) as SharedFile[];
}
