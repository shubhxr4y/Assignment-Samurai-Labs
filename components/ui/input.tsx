'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Right-align and use tabular figures — for money and quantity fields. */
  numeric?: boolean;
  prefixLabel?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, numeric, prefixLabel, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-9 w-full rounded border bg-surface px-3 text-body text-ink transition-colors',
          'placeholder:text-ink-subtle',
          'disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-subtle',
          invalid ? 'border-danger-border bg-danger-bg/40' : 'border-line-strong hover:border-ink-subtle',
          numeric && 'tabular text-right',
          prefixLabel && 'rounded-l-none border-l-0 pl-2',
          className,
        )}
        {...props}
      />
    );

    if (!prefixLabel) return field;

    return (
      <div className="flex">
        <span
          className={cn(
            'inline-flex h-9 select-none items-center rounded-l border border-r-0 bg-paper px-2.5 text-small text-ink-muted',
            invalid ? 'border-danger-border' : 'border-line-strong',
          )}
        >
          {prefixLabel}
        </span>
        {field}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'w-full rounded border bg-surface px-3 py-2 text-body text-ink transition-colors',
      'placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:bg-paper',
      invalid ? 'border-danger-border bg-danger-bg/40' : 'border-line-strong hover:border-ink-subtle',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
