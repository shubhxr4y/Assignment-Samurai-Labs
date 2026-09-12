import { cn } from '@/lib/utils';
import type { EntityStatus, PaymentStatus } from '@/types/api';

const PAYMENT_STYLES: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-paid-bg text-paid-fg border-paid-border' },
  partially_paid: {
    label: 'Partially paid',
    className: 'bg-partial-bg text-partial-fg border-partial-border',
  },
  pending: { label: 'Pending', className: 'bg-pending-bg text-pending-fg border-pending-border' },
};

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const style = PAYMENT_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-small font-medium transition-all duration-200',
        style.className,
        className,
      )}
    >
      <span className="relative flex size-2 items-center justify-center" aria-hidden>
        {status !== 'paid' ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" />
        ) : null}
        <span className="relative inline-flex size-1.5 rounded-full bg-current opacity-90" />
      </span>
      {style.label}
    </span>
  );
}

export function EntityBadge({ status, className }: { status: EntityStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-small font-medium',
        status === 'active'
          ? 'border-line-strong bg-paper text-ink-muted'
          : 'border-line bg-paper text-ink-subtle',
        className,
      )}
    >
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}
