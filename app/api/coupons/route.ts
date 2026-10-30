import type { CouponsResponse } from '@/lib/coupon-codes';
import { isCountryCode } from '@/lib/countries';
import { listCoupons } from '@/lib/coupons';
import { errorResponse } from '@/lib/errors';
import { getStoreSales } from '@/lib/sale';

/** Promo codes and store sales for one country. Uses saved data only, never a live search. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('country')?.toUpperCase();
  const country = isCountryCode(raw) ? raw : 'US';
  try {
    const [codes, sales] = await Promise.all([listCoupons(country), getStoreSales(country)]);
    const body: CouponsResponse = { codes, stores: sales.stores, salesCheckedAt: sales.checkedAt };
    return Response.json(body, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
  } catch (err) {
    return errorResponse(err);
  }
}
