import { isCountryCode } from '@/lib/countries';
import { errorResponse } from '@/lib/errors';
import { getSale } from '@/lib/sale';
import { isSaleTab } from '@/lib/sale-tabs';

export const maxDuration = 30;

/** Sale items for one tab and country. Same for every visitor, so the CDN can cache it. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tab = params.get('tab');
  if (!isSaleTab(tab)) {
    return Response.json({ error: 'Unknown tab.', code: 'bad_request' }, { status: 400 });
  }
  const raw = params.get('country')?.toUpperCase();
  const country = isCountryCode(raw) ? raw : 'US';
  try {
    const sale = await getSale(tab, country);
    return Response.json(sale, { headers: { 'cache-control': 'public, s-maxage=1800, stale-while-revalidate=86400' } });
  } catch (err) {
    return errorResponse(err);
  }
}
