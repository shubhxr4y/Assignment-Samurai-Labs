import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {Icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-line bg-paper">
          <Icon className="size-5 text-ink-subtle" />
        </div>
      ) : null}
      <p className="text-lead font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-body text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-danger-border bg-danger-bg">
        <AlertTriangle className="size-5 text-danger-fg" />
      </div>
      <p className="text-lead font-semibold text-ink">That didn’t load</p>
      <p className="mt-1 max-w-sm text-body text-ink-muted">{message}</p>
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('skeleton block h-4 w-full', className)} />;
}

/** Placeholder rows that keep a table's shape while it loads. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <tbody className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3.5">
              <Skeleton className={colIndex === 0 ? 'w-40' : 'w-20'} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
