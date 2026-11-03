'use client';

import { useId, useState } from 'react';
import type { CurrencyCode } from '@/lib/types';
import type { ResultFilters } from '@/lib/filters';
import { DEFAULT_FILTERS, activeFilterCount } from '@/lib/filters';
import { currencySymbol } from '@/lib/money';

/** A settings-style row with an iOS switch. The whole row is the tap target. */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-callout">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}

const STORES_SHOWN = 6;

const DAY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any time', value: null },
  { label: 'By tomorrow', value: 1 },
  { label: 'Within 3 days', value: 3 },
  { label: 'Within a week', value: 7 },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-footnote font-semibold text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ResultsFilters({
  filters,
  onChange,
  stores,
  currency,
  showTitle = true,
}: {
  filters: ResultFilters;
  onChange: (f: ResultFilters) => void;
  stores: { name: string; count: number }[];
  currency: CurrencyCode;
  showTitle?: boolean;
}) {
  const set = (patch: Partial<ResultFilters>) => onChange({ ...filters, ...patch });
  const count = activeFilterCount(filters);
  const symbol = currencySymbol(currency);
  const [allStores, setAllStores] = useState(false);
  // The sidebar and the phone sheet both render filters; each needs its own radio group.
  const group = useId();
  const visibleStores =
    allStores || stores.length <= STORES_SHOWN + 1
      ? stores
      : stores.filter((s, i) => i < STORES_SHOWN || filters.stores.includes(s.name));
  const price = (v: string) => (v ? Number(v.replace(/[^\d.]/g, '')) || null : null);
  return (
    <div className="space-y-7">
      {showTitle && (
        <div className="flex min-h-9 items-center justify-between">
          <h2 className="text-headline">Filters</h2>
          {count > 0 && (
            <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="press rounded-full px-2 py-1 text-subhead font-semibold text-accent-ink hover:bg-fill">
              Clear all
            </button>
          )}
        </div>
      )}

      <Group title="Delivery">
        {DAY_OPTIONS.map((o) => (
          <label key={o.label} className="flex min-h-10 cursor-pointer items-center gap-3 text-callout">
            <input type="radio" name={`${group}-maxDays`} checked={filters.maxDays === o.value} onChange={() => set({ maxDays: o.value })} className="radio" />
            {o.label}
          </label>
        ))}
        <Toggle label="Free shipping only" checked={filters.freeShipping} onChange={(v) => set({ freeShipping: v })} />
      </Group>

      <Group title="Price (total)">
        <div className="mt-1 flex items-center gap-2">
          <label className="field flex-1">
            <span className="text-muted">{symbol}</span>
            <input
              inputMode="decimal"
              placeholder="Min"
              aria-label="Minimum total price"
              value={filters.minPrice ?? ''}
              onChange={(e) => set({ minPrice: price(e.target.value) })}
            />
          </label>
          <span className="text-footnote text-muted">to</span>
          <label className="field flex-1">
            <span className="text-muted">{symbol}</span>
            <input
              inputMode="decimal"
              placeholder="Max"
              aria-label="Maximum total price"
              value={filters.maxPrice ?? ''}
              onChange={(e) => set({ maxPrice: price(e.target.value) })}
            />
          </label>
        </div>
      </Group>

      <Group title="Deals and sellers">
        <Toggle label="On sale" checked={filters.onSale} onChange={(v) => set({ onSale: v })} />
        <Toggle label="Exact matches only" checked={filters.exactOnly} onChange={(v) => set({ exactOnly: v })} />
        <Toggle label="Hide marketplace sellers" checked={filters.hideMarketplaces} onChange={(v) => set({ hideMarketplaces: v })} />
      </Group>

      {stores.length > 1 && (
        <Group title="Stores">
          {visibleStores.map((s) => {
            const checked = filters.stores.includes(s.name);
            return (
              <label key={s.name} className="flex min-h-10 cursor-pointer items-center gap-3 text-callout">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => set({ stores: checked ? filters.stores.filter((x) => x !== s.name) : [...filters.stores, s.name] })}
                  className="checkbox"
                />
                <span className="min-w-0 flex-1 truncate" title={s.name}>
                  {s.name}
                </span>
                <span className="tnum text-footnote text-muted">{s.count}</span>
              </label>
            );
          })}
          {stores.length > STORES_SHOWN + 1 && (
            <button
              type="button"
              onClick={() => setAllStores((v) => !v)}
              aria-expanded={allStores}
              className="press mt-1 rounded-full py-1.5 text-subhead font-semibold text-accent-ink hover:underline"
            >
              {allStores ? 'Show fewer stores' : `Show all ${stores.length} stores`}
            </button>
          )}
        </Group>
      )}
    </div>
  );
}
