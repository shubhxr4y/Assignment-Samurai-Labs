'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Shown under the label — e.g. a phone number or a unit price. */
  description?: string;
  /** Right-aligned secondary text — e.g. the price. */
  meta?: string;
  keywords?: string[];
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  loading?: boolean;
  className?: string;
  /** Offers "Add …" at the bottom of the list. */
  onCreate?: () => void;
  createLabel?: string;
}

/**
 * A searchable picker. A shop with 400 items should not have to scroll a
 * native select, and typing three letters is the fastest path to the right row.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches found.',
  disabled,
  invalid,
  loading,
  className,
  onCreate,
  createLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled || loading}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded border bg-surface px-3 text-body transition-colors',
            'disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-subtle',
            invalid
              ? 'border-danger-border bg-danger-bg/40'
              : 'border-line-strong hover:border-ink-subtle',
            className,
          )}
        >
          <span className={cn('truncate text-left', selected ? 'text-ink' : 'text-ink-subtle')}>
            {loading ? 'Loading…' : (selected?.label ?? placeholder)}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-ink-subtle" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 animate-scale-in overflow-hidden rounded-md border border-line bg-surface shadow-overlay"
        >
          <Command loop className="flex max-h-[18rem] flex-col">
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-3.5 shrink-0 text-ink-subtle" />
              <Command.Input
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-subtle"
              />
            </div>
            <Command.List className="overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-small text-ink-muted">
                {emptyMessage}
              </Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={`${option.label} ${option.keywords?.join(' ') ?? ''}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-body text-ink outline-none data-[selected=true]:bg-paper"
                >
                  <Check
                    className={cn(
                      'size-3.5 shrink-0 text-brand-600',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate text-small text-ink-subtle">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {option.meta ? (
                    <span className="tabular shrink-0 text-small text-ink-muted">{option.meta}</span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.List>
            {onCreate ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreate();
                }}
                className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-body font-medium text-brand-600 transition-colors hover:bg-paper"
              >
                <Plus className="size-3.5" />
                {createLabel ?? 'Add new'}
              </button>
            ) : null}
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
