import { cn } from '@/lib/utils';

/** A bound ledger: the spine on the left, ruled lines on the page. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden>
        <rect width="28" height="28" rx="7" className="fill-brand-600" />
        <rect x="6" y="6" width="3" height="16" rx="1.2" className="fill-white/45" />
        <rect x="11.5" y="8.5" width="10.5" height="1.8" rx="0.9" className="fill-white" />
        <rect x="11.5" y="13.1" width="10.5" height="1.8" rx="0.9" className="fill-white/75" />
        <rect x="11.5" y="17.7" width="6.5" height="1.8" rx="0.9" className="fill-white/55" />
      </svg>
      <span className="font-serif text-title font-semibold tracking-tight text-ink">Bahi</span>
    </span>
  );
}
