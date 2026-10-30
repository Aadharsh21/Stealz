'use client';

import type { CurrencyCode } from '@/lib/types';
import type { ResultFilters } from '@/lib/filters';
import { DEFAULT_FILTERS, activeFilterCount } from '@/lib/filters';
import { currencySymbol } from '@/lib/money';

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-[14px]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] cursor-pointer accent-[var(--ink)]"
      />
    </label>
  );
}

const DAY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any time', value: null },
  { label: 'By tomorrow', value: 1 },
  { label: 'Within 3 days', value: 3 },
  { label: 'Within a week', value: 7 },
];

export function ResultsFilters({
  filters,
  onChange,
  stores,
  currency,
}: {
  filters: ResultFilters;
  onChange: (f: ResultFilters) => void;
  stores: { name: string; count: number }[];
  currency: CurrencyCode;
}) {
  const set = (patch: Partial<ResultFilters>) => onChange({ ...filters, ...patch });
  const count = activeFilterCount(filters);
  const symbol = currencySymbol(currency);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Filters</h2>
        {count > 0 && (
          <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="text-[13px] font-semibold text-series hover:underline">
            Clear all
          </button>
        )}
      </div>

      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-muted">Delivery</legend>
        <div className="space-y-1">
          {DAY_OPTIONS.map((o) => (
            <label key={o.label} className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px]">
              <input
                type="radio"
                name="maxDays"
                checked={filters.maxDays === o.value}
                onChange={() => set({ maxDays: o.value })}
                className="h-4 w-4 cursor-pointer accent-[var(--ink)]"
              />
              {o.label}
            </label>
          ))}
        </div>
        <Toggle label="Free shipping only" checked={filters.freeShipping} onChange={(v) => set({ freeShipping: v })} />
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-muted">Price (total)</legend>
        <div className="flex items-center gap-2">
          <label className="flex h-10 flex-1 items-center rounded-lg px-2 text-[14px] ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-focus">
            <span className="text-muted">{symbol}</span>
            <input
              inputMode="decimal"
              placeholder="Min"
              aria-label="Minimum total price"
              value={filters.minPrice ?? ''}
              onChange={(e) => set({ minPrice: e.target.value ? Number(e.target.value.replace(/[^\d.]/g, '')) || null : null })}
              className="w-full bg-transparent px-1 focus:outline-none"
            />
          </label>
          <span className="text-muted">to</span>
          <label className="flex h-10 flex-1 items-center rounded-lg px-2 text-[14px] ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-focus">
            <span className="text-muted">{symbol}</span>
            <input
              inputMode="decimal"
              placeholder="Max"
              aria-label="Maximum total price"
              value={filters.maxPrice ?? ''}
              onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value.replace(/[^\d.]/g, '')) || null : null })}
              className="w-full bg-transparent px-1 focus:outline-none"
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-muted">Deals and sellers</legend>
        <Toggle label="On sale" checked={filters.onSale} onChange={(v) => set({ onSale: v })} />
        <Toggle label="Exact matches only" checked={filters.exactOnly} onChange={(v) => set({ exactOnly: v })} />
        <Toggle label="Hide marketplace sellers" checked={filters.hideMarketplaces} onChange={(v) => set({ hideMarketplaces: v })} />
      </fieldset>

      {stores.length > 1 && (
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold text-muted">Stores</legend>
          <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
            {stores.map((s) => {
              const checked = filters.stores.includes(s.name);
              return (
                <label key={s.name} className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      set({ stores: checked ? filters.stores.filter((x) => x !== s.name) : [...filters.stores, s.name] })
                    }
                    className="h-4 w-4 cursor-pointer accent-[var(--ink)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="tnum text-[12px] text-muted">{s.count}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
