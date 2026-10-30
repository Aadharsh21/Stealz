import { isCountryCode } from '@/lib/countries';
import { errorResponse } from '@/lib/errors';
import { isPickTab } from '@/lib/pick-tabs';
import { getPicks } from '@/lib/picks';

export const maxDuration = 30;

/** Home page picks for one tab and country. Same for every visitor, so the CDN can cache it. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tab = params.get('tab');
  if (!isPickTab(tab)) {
    return Response.json({ error: 'Unknown tab.', code: 'bad_request' }, { status: 400 });
  }
  const raw = params.get('country')?.toUpperCase();
  const country = isCountryCode(raw) ? raw : 'US';
  try {
    const picks = await getPicks(tab, country);
    return Response.json(picks, { headers: { 'cache-control': 'public, s-maxage=1800, stale-while-revalidate=86400' } });
  } catch (err) {
    return errorResponse(err);
  }
}
