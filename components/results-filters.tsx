'use client';

import { useState } from 'react';
import type { CurrencyCode } from '@/lib/types';
import type { Department } from '@/lib/category';
import type { Facets, ResultFilters } from '@/lib/filters';
import { DEFAULT_FILTERS, DEPARTMENT_LABELS, activeFilterCount } from '@/lib/filters';
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

const SHOWN = 6;

/** A checkbox list with counts, like the category and brand filters on store sites. */
function CheckList<T extends string>({
  legend,
  options,
  selected,
  onChange,
  label = (v) => v,
}: {
  legend: string;
  options: { value: T; count: number }[];
  selected: T[];
  onChange: (next: T[]) => void;
  label?: (value: T) => string;
}) {
  const [all, setAll] = useState(false);
  if (options.length < 2 && selected.length === 0) return null;
  const visible = all || options.length <= SHOWN + 1 ? options : options.filter((o, i) => i < SHOWN || selected.includes(o.value));
  return (
    <fieldset>
      <legend className="mb-1 text-[13px] font-semibold text-muted">{legend}</legend>
      <div className="space-y-0.5">
        {visible.map((o) => {
          const checked = selected.includes(o.value);
          return (
            <label key={o.value} className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px]">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
                className="h-4 w-4 cursor-pointer accent-[var(--ink)]"
              />
              <span className="min-w-0 flex-1 truncate">{label(o.value)}</span>
              <span className="tnum text-[12px] text-muted">{o.count}</span>
            </label>
          );
        })}
      </div>
      {options.length > SHOWN + 1 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-1 text-[13px] font-semibold text-series hover:underline"
        >
          {all ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      )}
    </fieldset>
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
  facets,
  currency,
}: {
  filters: ResultFilters;
  onChange: (f: ResultFilters) => void;
  stores: { name: string; count: number }[];
  facets: Facets;
  currency: CurrencyCode;
}) {
  const set = (patch: Partial<ResultFilters>) => onChange({ ...filters, ...patch });
  const count = activeFilterCount(filters);
  const symbol = currencySymbol(currency);
  const bucketOn = (b: { min: number | null; max: number | null }) => filters.minPrice === b.min && filters.maxPrice === b.max;
  const anyPrice = filters.minPrice == null && filters.maxPrice == null;
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

      <CheckList legend="Category" options={facets.categories} selected={filters.categories} onChange={(categories) => set({ categories })} />

      <CheckList<Department>
        legend="Department"
        options={facets.departments}
        selected={filters.departments}
        onChange={(departments) => set({ departments })}
        label={(d) => DEPARTMENT_LABELS[d]}
      />

      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-muted">Price (total)</legend>
        {facets.prices.length > 1 && (
          <div className="mb-2 space-y-0.5">
            <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px]">
              <input
                type="radio"
                name="priceRange"
                checked={anyPrice}
                onChange={() => set({ minPrice: null, maxPrice: null })}
                className="h-4 w-4 cursor-pointer accent-[var(--ink)]"
              />
              Any price
            </label>
            {facets.prices.map((b) => (
              <label key={b.label} className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px]">
                <input
                  type="radio"
                  name="priceRange"
                  checked={bucketOn(b)}
                  onChange={() => set({ minPrice: b.min, maxPrice: b.max })}
                  className="h-4 w-4 cursor-pointer accent-[var(--ink)]"
                />
                <span className="min-w-0 flex-1">{b.label}</span>
                <span className="tnum text-[12px] text-muted">{b.count}</span>
              </label>
            ))}
          </div>
        )}
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

      <CheckList legend="Brand" options={facets.brands} selected={filters.brands} onChange={(brands) => set({ brands })} />

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
        <legend className="mb-1 text-[13px] font-semibold text-muted">Deals and sellers</legend>
        <Toggle label="On sale" checked={filters.onSale} onChange={(v) => set({ onSale: v })} />
        <Toggle label="Exact matches only" checked={filters.exactOnly} onChange={(v) => set({ exactOnly: v })} />
        <Toggle label="Hide marketplace sellers" checked={filters.hideMarketplaces} onChange={(v) => set({ hideMarketplaces: v })} />
      </fieldset>

      <CheckList
        legend="Stores"
        options={stores.map((s) => ({ value: s.name, count: s.count }))}
        selected={filters.stores}
        onChange={(next) => set({ stores: next })}
      />
    </div>
  );
}
