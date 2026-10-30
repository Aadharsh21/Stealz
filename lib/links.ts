// Store links from Google can be relative ("/url?q=…", "/aclk?…") or redirects. Relative links
// would open as pages on our own site, so every outbound link is made absolute here or dropped.

const GOOGLE = 'https://www.google.com';

export function cleanLink(raw?: string | null): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    if (/^https?:\/\//i.test(value)) url = new URL(value);
    else if (value.startsWith('//')) url = new URL(`https:${value}`);
    else if (value.startsWith('/')) url = new URL(value, GOOGLE);
    else return undefined;
  } catch {
    return undefined;
  }
  // Unwrap Google's redirect so shoppers go straight to the store.
  if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/url') {
    const target = url.searchParams.get('q') ?? url.searchParams.get('url');
    if (target && /^https?:\/\//i.test(target)) return target;
  }
  return url.toString();
}

/** Fallback when a store gave no link: a Google search for the item at that store. */
export function searchLink(title: string, store: string): string {
  return `${GOOGLE}/search?q=${encodeURIComponent(`${title} ${store}`)}`;
}
