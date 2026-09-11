import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AmountInput } from '@/lib/format';

/**
 * Every rupee figure in the product goes through here, so grouping, tabular
 * figures and the muted treatment for zero are consistent everywhere.
 */
export function Amount({
  value,
  paise,
  className,
  muteZero = true,
  strong,
}: {
  value: AmountInput;
  paise?: boolean;
  className?: string;
  muteZero?: boolean;
  strong?: boolean;
}) {
  const isZero = Number(value ?? 0) === 0;
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        strong && 'font-medium',
        muteZero && isZero && 'text-ink-subtle',
        className,
      )}
    >
      {formatINR(value, { paise })}
    </span>
  );
}
