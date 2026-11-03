// Named product events, so every capture uses the same names and shapes.
import posthog from 'posthog-js';
import type { Offer } from './types';

type Events = {
  search_submitted: { query: string; country: string };
  store_clicked: { store: string; total: number; currency: string; is_search_link: boolean; source: 'best_pick' | 'offer_table' };
  watchlist_saved: { product: string };
  price_alert_created: { product: string; mode: 'any' | 'target'; target_price: number | null; current_low: number; currency: string };
};

export function track<E extends keyof Events>(event: E, props: Events[E]): void {
  try {
    if (posthog.__loaded) posthog.capture(event, props);
  } catch {
    // Analytics must never break the page.
  }
}

export function trackStoreClick(o: Offer, source: Events['store_clicked']['source']): void {
  track('store_clicked', { store: o.store, total: o.total, currency: o.currency, is_search_link: Boolean(o.linkIsSearch), source });
}
