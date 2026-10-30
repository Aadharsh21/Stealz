import { COUNTRIES } from '@/lib/countries';
import { errorResponse } from '@/lib/errors';
import { detectFromHeaders, locationFromParams, resolveLocation } from '@/lib/location';

/**
 * GET /api/location                     -> the visitor's approximate location from their IP
 * GET /api/location?country=US&postal=85281 -> validates and fills in a typed location
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tz = params.get('tz') ?? undefined;
  try {
    if (params.has('country')) {
      const loc = locationFromParams(params);
      const postal = params.get('postal');
      const cfg = COUNTRIES[loc.country];
      if (postal && !loc.postalCode) {
        return Response.json({ valid: false, error: cfg.postal?.invalid ?? 'Enter a valid postal code.' }, { status: 400 });
      }
      const resolved = await resolveLocation({ ...loc, source: loc.source === 'gps' ? 'gps' : 'manual' }, tz);
      const found = !postal || Boolean(resolved.city || resolved.region);
      return Response.json(
        found
          ? { valid: true, location: resolved }
          : { valid: false, error: `We couldn't find that ${cfg.postal?.noun ?? 'postal code'}. Check it and try again.` },
        { status: found ? 200 : 404, headers: { 'cache-control': 'no-store' } },
      );
    }
    const detected = detectFromHeaders(request.headers);
    const location = await resolveLocation(detected.location, tz);
    return Response.json(
      { supported: detected.supported, detectedCountry: detected.detectedCountry, location },
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
