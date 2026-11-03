'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/lib/countries';
import { addRecentSearch, clearRecentSearches, loadRecentSearches } from '@/lib/storage';
import { popularSearches, suggest } from '@/lib/suggestions';
import { ClockIcon, SearchIcon, XIcon } from './icons';
import { useLocation } from './location-provider';

interface Option {
  text: string;
  kind: 'recent' | 'popular' | 'suggestion';
}

export function SearchBox({
  size = 'md',
  initialQuery = '',
  autoFocus = false,
}: {
  size?: 'md' | 'lg';
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const { location } = useLocation();
  const country = location?.country ?? 'US';
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => setValue(initialQuery), [initialQuery]);
  useEffect(() => setRecent(loadRecentSearches()), [open]);

  const options = useMemo<Option[]>(() => {
    if (value.trim().length === 0) {
      const r = recent.slice(0, 5).map((text) => ({ text, kind: 'recent' as const }));
      const p = popularSearches(country)
        .filter((t) => !recent.some((x) => x.toLowerCase() === t.toLowerCase()))
        .slice(0, 6 - Math.min(r.length, 3))
        .map((text) => ({ text, kind: 'popular' as const }));
      return [...r, ...p];
    }
    return suggest(value, country).map((text) => ({ text, kind: 'suggestion' as const }));
  }, [value, recent, country]);

  function go(query: string) {
    const q = query.trim();
    if (q.length < 2) return;
    addRecentSearch(q);
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(active >= 0 && options[active] ? options[active].text : value);
    }
  }

  const large = size === 'lg';
  const showList = open && options.length > 0;
  const heading = value.trim() ? null : recent.length ? 'Recent and popular' : `Popular in ${COUNTRIES[country].inPhrase}`;

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
      className="relative w-full"
    >
      {/* One field, one ring: the field lights up as a whole when the input inside is focused. */}
      <div data-size={size} className={`search-field ${large ? 'h-16 pl-5 pr-2' : 'h-10 pl-3.5 pr-1'}`}>
        <SearchIcon size={large ? 22 : 17} strokeWidth={2} className="shrink-0 text-muted" />
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search for an item
        </label>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Search a brand or item"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className={`h-full min-w-0 flex-1 text-ellipsis bg-transparent text-ink ${large ? 'px-3 text-[1.0625rem] tracking-[-0.012em] sm:text-[1.1875rem] sm:tracking-[-0.014em]' : 'px-2.5 text-callout'}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
            className="press mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-fill hover:text-ink"
            aria-label="Clear search"
          >
            <XIcon size={15} strokeWidth={2.2} />
          </button>
        )}
        <button
          type="submit"
          className={`press shrink-0 rounded-full bg-ink font-semibold text-paper hover:bg-ink/85 ${
            large ? 'h-12 px-6 text-callout' : 'h-8 px-3.5 text-footnote'
          }`}
        >
          {large ? (
            <>
              <span className="sm:hidden">Search</span>
              <span className="hidden sm:inline">Compare prices</span>
            </>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {showList && (
        <div className="popover material-thick absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[1.25rem] py-1.5 shadow-float">
          {heading && (
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
              <span className="text-footnote font-semibold text-muted">{heading}</span>
              {recent.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    clearRecentSearches();
                    setRecent([]);
                  }}
                  className="press rounded-full px-2 py-1 text-footnote font-semibold text-accent-ink hover:bg-fill"
                >
                  Clear recent
                </button>
              )}
            </div>
          )}
          <ul id={listId} role="listbox" aria-label="Suggestions" className="px-1.5">
            {options.map((opt, i) => (
              <li
                key={`${opt.kind}-${opt.text}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(opt.text)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-callout ${i === active ? 'bg-fill' : ''}`}
              >
                {opt.kind === 'recent' ? (
                  <ClockIcon size={16} className="shrink-0 text-muted" />
                ) : (
                  <SearchIcon size={16} className="shrink-0 text-muted" />
                )}
                <span className="truncate">{opt.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
