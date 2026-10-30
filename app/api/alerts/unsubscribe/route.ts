import { unsubscribeAlert } from '@/lib/alerts';

/**
 * Stops alerts for one item. Used by the unsubscribe page and by email clients' one-click
 * unsubscribe (RFC 8058 List-Unsubscribe-Post), which POST to this URL.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = await unsubscribeAlert(token).catch(() => null);
  return Response.json({ ok: Boolean(result), title: result?.title ?? null }, { headers: { 'cache-control': 'no-store' } });
}
