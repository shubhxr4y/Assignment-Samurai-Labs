'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { optional?: boolean }
>(({ className, children, optional, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('flex items-center gap-1.5 text-small font-medium text-ink', className)}
    {...props}
  >
    {children}
    {optional ? <span className="text-small font-normal text-ink-subtle">optional</span> : null}
  </LabelPrimitive.Root>
));
Label.displayName = 'Label';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + one message slot. Hint and error never show together. */
export function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} optional={optional}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-small text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="text-small text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
