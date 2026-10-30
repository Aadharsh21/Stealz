import { after } from 'next/server';
import { errorResponse, AppError } from '@/lib/errors';
import { clientIp } from '@/lib/limits';
import { locationFromParams } from '@/lib/location';
import { runLookup } from '@/lib/lookup';

export const maxDuration = 30;

interface Body {
  title?: unknown;
  brand?: unknown;
  price?: unknown;
  currency?: unknown;
  color?: unknown;
  url?: unknown;
  tz?: unknown;
  location?: Record<string, unknown>;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/**
 * POST /api/lookup, used by the Chrome extension: the product on the page the shopper is
 * viewing, priced at every store for their location, plus the same item in other colors.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const title = text(body?.title, 300);
    if (!body || !title || title.length < 3) throw new AppError('Send the product name to look up.', 400, 'bad_request');
    const params = new URLSearchParams();
    for (const key of ['country', 'postal', 'city', 'region', 'regionCode', 'source']) {
      const v = text(body.location?.[key], 60);
      if (v) params.set(key, v);
    }
    const price = typeof body.price === 'number' ? body.price : Number(text(body.price, 20)?.replace(/[^\d.]/g, ''));
    const { response, background } = await runLookup({
      title,
      brand: text(body.brand, 80),
      price: Number.isFinite(price) && price > 0 ? price : undefined,
      currency: text(body.currency, 3),
      color: text(body.color, 60),
      url: text(body.url, 2000),
      location: locationFromParams(params),
      tz: text(body.tz, 64),
      ip: clientIp(request.headers),
    });
    if (background) after(background);
    return Response.json(response, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return errorResponse(err);
  }
}
