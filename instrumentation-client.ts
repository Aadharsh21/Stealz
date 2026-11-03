// Product analytics with PostHog. Next.js runs this file in the browser before the app starts.
// Events go through /ingest on our own domain (see next.config.ts) so ad blockers do not drop them.
import posthog from 'posthog-js';

// The project key is a public, write-only key that is meant to ship in browser code.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_rbY43DGyamjDENAT29x6QMnqd5Jmb9a9VkpZEppAbLRE';

if (key && process.env.NODE_ENV === 'production') {
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2025-05-24',
    person_profiles: 'identified_only',
    capture_exceptions: true,
    session_recording: {
      // Email fields (price alerts) are never recorded.
      maskAllInputs: true,
    },
  });
}
