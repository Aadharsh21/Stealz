import { after } from 'next/server';
import { AppError, errorResponse } from '@/lib/errors';
import { clientIp } from '@/lib/limits';
import { locationFromParams } from '@/lib/location';
import { runProduct } from '@/lib/product';
import { decodeRef } from '@/lib/ref';

export const maxDuration = 30;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const ref = decodeRef(params.get('ref'));
    if (!ref) throw new AppError('This product link is broken. Search for the item again.', 400, 'bad_request');
    const { response, background } = await runProduct({
      ref,
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
