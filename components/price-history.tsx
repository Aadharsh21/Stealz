'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CurrencyCode, HistoryResponse } from '@/lib/types';
import { dayFromIso, formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

function niceTicks(min: number, max: number, count = 4): number[] {
  const range = Math.max(1e-6, max - min);
  const rough = range / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function PriceHistory({ history, currency, locale }: { history: HistoryResponse; currency: CurrencyCode; locale: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = history.points;
  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const days = points.map((p) => dayFromIso(p.date) ?? 0);
    const values = points.map((p) => p.low);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const padV = Math.max((maxV - minV) * 0.15, maxV * 0.03);
    const lo = Math.max(0, minV - padV);
    const hi = maxV + padV;
    const d0 = days[0];
    const d1 = Math.max(days[days.length - 1], d0 + 1);
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (d: number) => PAD.left + ((d - d0) / (d1 - d0)) * innerW;
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;
    const xy = points.map((p, i) => [x(days[i]), y(p.low)] as const);
    const line = xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
    const area = `${line}L${xy[xy.length - 1][0].toFixed(1)},${PAD.top + innerH}L${xy[0][0].toFixed(1)},${PAD.top + innerH}Z`;
    return { xy, line, area, ticks: niceTicks(lo, hi), y, innerW, innerH };
  }, [points, width]);

  if (!geo) return null;

  const lowIndex = points.reduce((best, p, i) => (p.low < points[best].low ? i : best), 0);
  const last = points.length - 1;
  const money = (n: number) => formatMoney(n, currency);
  const active = hover ?? null;
  // Sit the "Today" label above the highest point it spans so it never covers the line.
  const todayLabelY = Math.max(
    12,
    Math.min(...geo.xy.filter(([px]) => px >= geo.xy[last][0] - 110).map(([, py]) => py)) - 10,
  );

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    let nearest = 0;
    let dist = Infinity;
    geo.xy.forEach(([x], i) => {
      const d = Math.abs(x - px);
      if (d < dist) {
        dist = d;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  const labelAnchor = (x: number) => (x > width - 120 ? 'end' : x < PAD.left + 60 ? 'start' : 'middle');

  return (
    <div>
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: 'Lowest', value: history.lowest?.total, sub: history.lowest ? formatDay(history.lowest.date, locale, false) : '' },
          { label: 'Average', value: history.average, sub: `${points.length} days` },
          { label: 'Highest', value: history.highest?.total, sub: history.highest ? formatDay(history.highest.date, locale, false) : '' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-canvas px-3 py-2.5">
            <dt className="text-[12px] text-muted">{s.label}</dt>
            <dd className="text-[17px] font-bold">{s.value != null ? money(s.value) : '—'}</dd>
            <dd className="text-[12px] text-muted">{s.sub}</dd>
          </div>
        ))}
      </dl>

      <div
        ref={wrapRef}
        className="relative mt-4 select-none"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Lowest total per day, from ${money(Math.min(...points.map((p) => p.low)))} to ${money(Math.max(...points.map((p) => p.low)))}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? last) - 1));
            if (e.key === 'ArrowRight') setHover((h) => Math.min(last, (h ?? 0) + 1));
          }}
          onBlur={() => setHover(null)}
          className="block overflow-visible focus-visible:outline-2"
        >
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="tnum fill-[var(--muted)] text-[11px]">
                {formatMoney(t, currency, { compact: true })}
              </text>
            </g>
          ))}
          {[0, Math.floor(last / 2), last].map((i) => (
            <text key={i} x={geo.xy[i][0]} y={HEIGHT - 8} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} className="fill-[var(--muted)] text-[11px]">
              {i === last ? 'Today' : formatDay(points[i].date, locale, false)}
            </text>
          ))}
          <path d={geo.area} fill="var(--series-wash)" />
          <path d={geo.line} fill="none" stroke="var(--series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {lowIndex !== last && (
            <g>
              <circle cx={geo.xy[lowIndex][0]} cy={geo.xy[lowIndex][1]} r={4} fill="var(--series)" stroke="var(--paper)" strokeWidth={2} />
              <text
                x={geo.xy[lowIndex][0]}
                y={geo.xy[lowIndex][1] + 18}
                textAnchor={labelAnchor(geo.xy[lowIndex][0])}
                stroke="var(--paper)"
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
                className="fill-[var(--ink-soft)] text-[11px] font-semibold"
              >
                Lowest {money(points[lowIndex].low)}
              </text>
            </g>
          )}
          <circle cx={geo.xy[last][0]} cy={geo.xy[last][1]} r={5} fill="var(--series)" stroke="var(--paper)" strokeWidth={2} />
          <text
            x={geo.xy[last][0] - 8}
            y={todayLabelY}
            textAnchor="end"
            stroke="var(--paper)"
            strokeWidth={4}
            strokeLinejoin="round"
            paintOrder="stroke"
            className="fill-[var(--ink)] text-[12px] font-bold"
          >
            Today {money(points[last].low)}
          </text>

          {active != null && (
            <g pointerEvents="none">
              <line x1={geo.xy[active][0]} x2={geo.xy[active][0]} y1={PAD.top} y2={PAD.top + geo.innerH} stroke="var(--ink-soft)" strokeWidth={1} />
              <circle cx={geo.xy[active][0]} cy={geo.xy[active][1]} r={5} fill="var(--series)" stroke="var(--paper)" strokeWidth={2} />
            </g>
          )}
        </svg>

        {active != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg bg-paper px-3 py-2 text-[12px] shadow-lg ring-1 ring-line"
            style={{
              left: Math.min(Math.max(geo.xy[active][0] - 70, 0), width - 150),
            }}
            role="status"
          >
            <div className="text-[15px] font-bold">{money(points[active].low)}</div>
            <div className="text-muted">
              {formatDay(points[active].date, locale)}
              {points[active].store ? `, ${points[active].store}` : ''}
            </div>
          </div>
        )}
      </div>

      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer font-semibold text-ink-soft">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg ring-1 ring-line">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-canvas text-muted">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-semibold">Date</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Lowest total</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Store</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-line">
                  <td className="px-3 py-1.5">{formatDay(p.date, locale)}</td>
                  <td className="tnum px-3 py-1.5 text-right">{money(p.low)}</td>
                  <td className="px-3 py-1.5 text-muted">{p.store ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
