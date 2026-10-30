import { BRAND } from '@/lib/brand';
import { config, dataMode, ebayEnabled, emailEnabled, googleEnabled, hasDatabase } from '@/lib/config';
import { query } from '@/lib/db';
import { liveCreditUsage } from '@/lib/limits';
import { serpApiAccount } from '@/lib/usage';

/** Setup check: which services are configured (never shows secrets). */
export async function GET() {
  let database: 'ok' | 'not configured' | 'error' = hasDatabase() ? 'ok' : 'not configured';
  if (hasDatabase()) {
    try {
      await query('select 1');
    } catch {
      database = 'error';
    }
  }
  const c = config();
  return Response.json(
    {
      app: BRAND.name,
      dataMode: dataMode(),
      googleShopping: googleEnabled(),
      ebay: ebayEnabled(),
      database,
      email: emailEnabled(),
      cronSecretSet: Boolean(c.cronSecret),
      appUrl: c.appUrl,
      liveSearches: database === 'ok' ? await liveCreditUsage() : null,
      serpApiPlan: await serpApiAccount(),
      usageWarningsTo: c.ownerEmail ? 'set' : 'not set',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
