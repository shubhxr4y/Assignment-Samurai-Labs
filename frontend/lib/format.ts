/**
 * Formatting helpers.
 *
 * Rupee amounts use Indian digit grouping throughout — 1,25,000, not 125,000.
 * Amounts arrive from the API as decimal *strings* (NUMERIC over the wire), so
 * they are never parsed into a float before being displayed.
 */

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export type AmountInput = string | number | null | undefined;

function toNumber(value: AmountInput): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * ₹1,25,000 in dense contexts; ₹1,25,000.50 when there are paise to show.
 * Pass `paise: true` on documents where the exact figure matters (invoices).
 */
export function formatINR(value: AmountInput, options: { paise?: boolean } = {}): string {
  const amount = toNumber(value);
  const hasPaise = Math.abs(amount % 1) > 0.0001;
  return options.paise || hasPaise ? inrPaise.format(amount) : inrWhole.format(amount);
}

/** Compact figure for dashboard tiles: ₹23.4 L / ₹1.2 Cr. */
export function formatINRCompact(value: AmountInput): string {
  const amount = toNumber(value);
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) return `₹${plainNumber.format(Number((amount / 10_000_000).toFixed(2)))} Cr`;
  if (abs >= 100_000) return `₹${plainNumber.format(Number((amount / 100_000).toFixed(2)))} L`;
  return inrWhole.format(amount);
}

/** 1,250 / 2.5 — quantities keep their decimals only when they have them. */
export function formatQuantity(value: AmountInput): string {
  return plainNumber.format(toNumber(value));
}

export function formatPercent(value: AmountInput): string {
  const amount = toNumber(value);
  return `${plainNumber.format(amount)}%`;
}

/** 11 Sep 2026 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Today's date as YYYY-MM-DD in the user's own timezone. */
export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** "5 days" / "1 month" — used for how long a payment has been outstanding. */
export function formatAge(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 45) return `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}
