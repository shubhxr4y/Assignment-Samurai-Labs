'use client';

import * as React from 'react';
import { formatINR, formatINRCompact } from '@/lib/format';
import type { MonthlySalesRow } from '@/types/api';

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short' });

/**
 * Six months of invoiced value, with the collected portion filled in solid.
 * Hand-drawn SVG rather than a charting library: a six-bar chart does not
 * justify 40 kB of JavaScript, and this way it inherits the design tokens.
 */
export function SalesChart({ data }: { data: MonthlySalesRow[] }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const max = Math.max(...data.map((row) => Number(row.total_sales)), 1);

  return (
    <div>
      <div className="flex items-end gap-3 sm:gap-5" style={{ height: 168 }}>
        {data.map((row, idx) => {
          const total = Number(row.total_sales);
          const collected = Number(row.total_collected);
          const totalHeight = Math.max((total / max) * 140, total > 0 ? 4 : 2);
          const collectedHeight = total > 0 ? (collected / total) * totalHeight : 0;
          const [year, month] = row.month.split('-');
          const label = MONTH_LABEL.format(new Date(Number(year), Number(month) - 1, 1));

          const currentTotalHeight = mounted ? totalHeight : 4;
          const currentCollectedHeight = mounted ? collectedHeight : 0;

          return (
            <div key={row.month} className="group flex flex-1 flex-col items-center justify-end gap-2">
              <span className="tabular text-small text-ink-muted transition-opacity duration-300 group-hover:text-ink font-medium">
                {total > 0 ? formatINRCompact(total) : '—'}
              </span>
              <div
                className="relative w-full max-w-14 overflow-hidden rounded-t-md bg-brand-100 transition-all duration-700 ease-out group-hover:bg-brand-200/80"
                style={{
                  height: currentTotalHeight,
                  transitionDelay: `${idx * 75}ms`,
                }}
                title={`${label}: invoiced ${formatINR(total)}, received ${formatINR(collected)}`}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t bg-gradient-to-t from-brand-700 to-brand-600 transition-all duration-700 ease-out"
                  style={{
                    height: currentCollectedHeight,
                    transitionDelay: `${idx * 75 + 100}ms`,
                  }}
                />
              </div>
              <span className="text-small text-ink-subtle transition-colors duration-200 group-hover:text-ink font-medium">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-small text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-600" aria-hidden />
          Received
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-100" aria-hidden />
          Still outstanding
        </span>
      </div>
    </div>
  );
}
