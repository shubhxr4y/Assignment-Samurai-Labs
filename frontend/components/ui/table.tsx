import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table primitives. Numeric columns get `numeric`, which right-aligns and
 * switches on tabular figures so columns of rupees line up.
 */
export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full border-collapse text-body', className)} {...props} />
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-line', className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-line', className)} {...props} />;
}

export function TR({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(interactive && 'cursor-pointer transition-colors hover:bg-paper', className)}
      {...props}
    />
  );
}

export function TH({
  className,
  numeric,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-label uppercase text-ink-subtle',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  numeric,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle', numeric && 'tabular text-right', className)}
      {...props}
    />
  );
}

/** Sortable column header button. */
export function SortableTH({
  label,
  field,
  active,
  order,
  onSort,
  numeric,
}: {
  label: string;
  field: string;
  active: boolean;
  order: 'asc' | 'desc';
  onSort: (field: string) => void;
  numeric?: boolean;
}) {
  return (
    <TH numeric={numeric}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm text-label uppercase transition-colors hover:text-ink',
          active ? 'text-ink' : 'text-ink-subtle',
        )}
      >
        {label}
        <span aria-hidden className={cn('text-[9px]', active ? 'opacity-100' : 'opacity-0')}>
          {order === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </TH>
  );
}
