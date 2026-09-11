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
  const max = Math.max(...data.map((row) => Number(row.total_sales)), 1);

  return (
    <div>
      <div className="flex items-end gap-3 sm:gap-5" style={{ height: 168 }}>
        {data.map((row) => {
          const total = Number(row.total_sales);
          const collected = Number(row.total_collected);
          const totalHeight = Math.max((total / max) * 140, total > 0 ? 4 : 2);
          const collectedHeight = total > 0 ? (collected / total) * totalHeight : 0;
          const [year, month] = row.month.split('-');
          const label = MONTH_LABEL.format(new Date(Number(year), Number(month) - 1, 1));

          return (
            <div key={row.month} className="flex flex-1 flex-col items-center justify-end gap-2">
              <span className="tabular text-small text-ink-muted">
                {total > 0 ? formatINRCompact(total) : '—'}
              </span>
              <div
                className="relative w-full max-w-14 rounded-t bg-brand-100"
                style={{ height: totalHeight }}
                title={`${label}: invoiced ${formatINR(total)}, received ${formatINR(collected)}`}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t bg-brand-600"
                  style={{ height: collectedHeight }}
                />
              </div>
              <span className="text-small text-ink-subtle">{label}</span>
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
