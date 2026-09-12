import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  action,
  backHref,
  backLabel,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 animate-fade-in', className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="group mb-3 inline-flex items-center gap-1 rounded-sm text-small font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
          {backLabel ?? 'Back'}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display font-semibold tracking-tight text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-body text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
