// Product references are packed into the comparison page URL, so links can be shared and
// reopened without a database. Works in both the browser and on the server.

import type { DataSource, ProductRef } from './types';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeRef(ref: ProductRef): string {
  return toBase64Url(JSON.stringify(ref));
}

const SOURCES: DataSource[] = ['google', 'ebay', 'demo'];
const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined;

export function decodeRef(value: string | null | undefined): ProductRef | null {
  if (!value || value.length > 6000) return null;
  try {
    const raw = JSON.parse(fromBase64Url(value)) as Record<string, unknown>;
    const p = raw.p as DataSource;
    const k = str(raw.k, 120);
    const q = str(raw.q, 200);
    const title = str(raw.title, 300);
    if (raw.v !== 1 || !SOURCES.includes(p) || !k || !q || !title) return null;
    const img = str(raw.img, 2000);
    return {
      v: 1,
      p,
      k,
      q,
      title,
      img: img && /^(https:\/\/|data:image\/svg\+xml|\/api\/demo-image\?)/.test(img) ? img : undefined,
      t: str(raw.t, 4000),
      pid: str(raw.pid, 40),
    };
  } catch {
    return null;
  }
}

export function productHref(ref: string): string {
  return `/product?ref=${encodeURIComponent(ref)}`;
}
