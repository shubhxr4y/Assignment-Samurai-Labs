import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatINR, formatQuantity } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/states';

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  href,
  loading,
  format = 'currency',
  className: propClassName,
}: {
  label: string;
  value: string | number | null | undefined;
  hint?: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'attention';
  href?: string;
  loading?: boolean;
  /** Rupee figures by default; `count` for plain totals like "8 customers". */
  format?: 'currency' | 'count';
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-label uppercase tracking-wider text-ink-subtle">{label}</p>
        {href ? (
          <ArrowUpRight className="size-4 text-ink-subtle transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600" />
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-32" />
      ) : (
        <p
          className={cn(
            'tabular mt-2 text-figure font-semibold tracking-tight transition-transform duration-200 group-hover:translate-x-0.5',
            tone === 'attention' && 'text-partial-fg',
            tone === 'positive' && 'text-paid-fg',
            tone === 'neutral' && 'text-ink',
          )}
        >
          {format === 'currency' ? formatINR(value) : formatQuantity(value)}
        </p>
      )}
      {hint ? <div className="mt-1.5 text-small text-ink-muted">{hint}</div> : null}
    </>
  );

  const className = cn(
    'relative block rounded-lg border border-line bg-surface p-5 shadow-card transition-all duration-300',
    'hover:-translate-y-1 hover:shadow-md hover:border-line-strong',
    tone === 'positive' && 'hover:border-paid-border/80',
    tone === 'attention' && 'hover:border-partial-border/80',
    tone === 'neutral' && 'hover:border-brand-200',
    href && 'group',
    propClassName,
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
