'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded border border-line-strong bg-surface pr-8 text-body text-ink transition-colors placeholder:text-ink-subtle hover:border-ink-subtle"
        style={{ paddingLeft: '2.125rem' }}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-subtle transition-colors hover:bg-line/50 hover:text-ink"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

/** Segmented filter — faster than a dropdown for three or four options. */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded border border-line-strong bg-surface p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-small font-medium transition-colors',
            value === option.value
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="tabular ml-1.5 text-ink-subtle">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    />
  );
}
