import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  title,
  description,
  action,
  backHref,
  backLabel,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 rounded-sm text-small font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          {backLabel ?? 'Back'}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display font-semibold text-ink">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-body text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
