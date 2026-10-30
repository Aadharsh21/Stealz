import { productsDueForCheck } from '@/lib/alerts';
import { purgeExpiredCache } from '@/lib/cache';
import { config, hasDatabase } from '@/lib/config';
import { toAppError } from '@/lib/errors';
import { runProduct } from '@/lib/product';

export const maxDuration = 60;

/**
 * Daily job (see vercel.json): re-checks prices for items people are watching and sends
 * price-drop emails. Vercel sends "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: Request) {
  const secret = config().cronSecret;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasDatabase()) return Response.json({ ok: true, skipped: 'no database' });

  const purged = await purgeExpiredCache().catch(() => 0);
  const due = await productsDueForCheck(config().maxAlertChecksPerRun);
  const results: { product: string; ok: boolean; error?: string }[] = [];
  for (const item of due) {
    try {
      const { background } = await runProduct({
        ref: item.ref,
        location: item.location,
        tz: item.location.timeZone,
        ip: 'cron',
        fresh: true,
      });
      if (background) await background();
      results.push({ product: item.product_key, ok: true });
    } catch (err) {
      const e = toAppError(err);
      results.push({ product: item.product_key, ok: false, error: e.message });
      if (e.code === 'budget') break; // out of live-search credits for today
    }
  }
  return Response.json({ ok: true, checked: results.length, purged, results });
}
