import { after } from 'next/server';
import { errorResponse } from '@/lib/errors';
import { clientIp } from '@/lib/limits';
import { locationFromParams } from '@/lib/location';
import { runSearch } from '@/lib/search';

export const maxDuration = 30;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const { response, background } = await runSearch({
      query: params.get('q') ?? '',
      location: locationFromParams(params),
      tz: params.get('tz') ?? undefined,
      ip: clientIp(request.headers),
    });
    if (background) after(background);
    return Response.json(response, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return errorResponse(err);
  }
}
