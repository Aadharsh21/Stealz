// Server-side settings, read from environment variables (see .env.example).

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export interface AppConfig {
  serpApiKey: string;
  ebayClientId: string;
  ebayClientSecret: string;
  ebayCampaignId: string;
  databaseUrl: string;
  resendApiKey: string;
  emailFrom: string;
  appUrl: string;
  cronSecret: string;
  cacheTtlHours: number;
  dailyLiveSearches: number;
  monthlyLiveSearches: number;
  searchesPerIpPerHour: number;
  alertsPerIpPerHour: number;
  maxAlertChecksPerRun: number;
  demoMode: 'auto' | 'on' | 'off';
}

export function config(): AppConfig {
  const env = process.env;
  const demo = (env.DEMO_MODE ?? 'auto').toLowerCase();
  return {
    serpApiKey: (env.SERPAPI_API_KEY ?? env.SERPAPI_KEY ?? '').trim(),
    ebayClientId: (env.EBAY_CLIENT_ID ?? '').trim(),
    ebayClientSecret: (env.EBAY_CLIENT_SECRET ?? '').trim(),
    ebayCampaignId: (env.EBAY_CAMPAIGN_ID ?? '').trim(),
    databaseUrl: (env.DATABASE_URL ?? env.POSTGRES_URL ?? '').trim(),
    resendApiKey: (env.RESEND_API_KEY ?? '').trim(),
    emailFrom: (env.EMAIL_FROM ?? '').trim(),
    appUrl: (env.APP_URL ?? (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')).replace(/\/$/, ''),
    cronSecret: (env.CRON_SECRET ?? '').trim(),
    cacheTtlHours: num(env.CACHE_TTL_HOURS, 6),
    dailyLiveSearches: num(env.DAILY_LIVE_SEARCHES, 40),
    monthlyLiveSearches: num(env.MONTHLY_LIVE_SEARCHES, 240),
    searchesPerIpPerHour: num(env.SEARCHES_PER_IP_PER_HOUR, 20),
    alertsPerIpPerHour: num(env.ALERTS_PER_IP_PER_HOUR, 6),
    maxAlertChecksPerRun: num(env.MAX_ALERT_CHECKS_PER_RUN, 3),
    demoMode: demo === 'on' || demo === 'true' ? 'on' : demo === 'off' || demo === 'false' ? 'off' : 'auto',
  };
}

export function googleEnabled(): boolean {
  const c = config();
  return Boolean(c.serpApiKey) && c.demoMode !== 'on';
}

export function ebayEnabled(): boolean {
  const c = config();
  return Boolean(c.ebayClientId && c.ebayClientSecret) && c.demoMode !== 'on';
}

/** Live data when a data source is configured, otherwise demo data (unless DEMO_MODE=off). */
export function dataMode(): 'live' | 'demo' | 'none' {
  if (googleEnabled() || ebayEnabled()) return 'live';
  return config().demoMode === 'off' ? 'none' : 'demo';
}

export function hasDatabase(): boolean {
  return Boolean(config().databaseUrl);
}

export function emailEnabled(): boolean {
  const c = config();
  return Boolean(c.resendApiKey && c.emailFrom);
}
