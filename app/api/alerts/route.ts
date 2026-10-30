import { createAlert } from '@/lib/alerts';
import { isCountryCode } from '@/lib/countries';
import { AppError, errorResponse } from '@/lib/errors';
import { clientIp } from '@/lib/limits';
import { resolveLocation } from '@/lib/location';
import { decodeRef } from '@/lib/ref';
import type { CurrencyCode, UserLocation } from '@/lib/types';

interface Body {
  ref?: string;
  email?: string;
  targetPrice?: number | null;
  currentLow?: number;
  currency?: string;
  image?: string;
  location?: Partial<UserLocation>;
  tz?: string;
}

const CURRENCIES: CurrencyCode[] = ['USD', 'GBP', 'AED', 'INR'];

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body) throw new AppError('Invalid request.', 400, 'bad_request');
    const ref = decodeRef(body.ref);
    if (!ref) throw new AppError('This product link is broken.', 400, 'bad_request');
    const currency = CURRENCIES.find((c) => c === body.currency);
    const country = body.location?.country;
    if (!currency || !isCountryCode(country)) throw new AppError('Invalid request.', 400, 'bad_request');
    const location = await resolveLocation(
      {
        country,
        postalCode: typeof body.location?.postalCode === 'string' ? body.location.postalCode.slice(0, 10) : undefined,
        city: typeof body.location?.city === 'string' ? body.location.city.slice(0, 60) : undefined,
        region: typeof body.location?.region === 'string' ? body.location.region.slice(0, 60) : undefined,
        regionCode: typeof body.location?.regionCode === 'string' ? body.location.regionCode.slice(0, 6) : undefined,
        source: 'manual',
      },
      body.tz,
    );
    const result = await createAlert({
      ref,
      email: String(body.email ?? ''),
      targetPrice: typeof body.targetPrice === 'number' && Number.isFinite(body.targetPrice) ? body.targetPrice : null,
      currentLow: Number(body.currentLow),
      currency,
      location,
      image: typeof body.image === 'string' && body.image.startsWith('https://') ? body.image.slice(0, 2000) : undefined,
      ip: clientIp(request.headers),
    });
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
