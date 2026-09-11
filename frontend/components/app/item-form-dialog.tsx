'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequestError } from '@/lib/api';
import { createItem, updateItem } from '@/services/items';
import { revalidate } from '@/hooks/use-api';
import type { Item } from '@/types/api';

const amountField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Please enter ${label}.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), {
      message: `${label[0]?.toUpperCase()}${label.slice(1)} must be a number with up to two decimals, and cannot be negative.`,
    })
    .refine((v) => Number(v) <= max, { message: `That ${label} looks too large.` });

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter the item name.').max(200),
  description: z.string().trim().max(500),
  unit: z.string().trim().min(1, 'Please enter a unit, for example piece or kg.').max(20),
  unit_price: amountField('a unit price', 99_999_999_999),
  tax_rate: amountField('a tax rate', 100),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: '',
  description: '',
  unit: 'piece',
  unit_price: '',
  tax_rate: '18',
  status: 'active',
};

/** The GST slabs an Indian small business actually uses, plus a free-text escape hatch. */
const GST_SLABS = ['0', '5', '12', '18', '28'];
const UNITS = ['piece', 'kg', 'litre', 'metre', 'box', 'bag', 'coil', 'hour', 'day', 'service'];

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  onSaved?: (item: Item) => void;
}) {
  const editing = Boolean(item);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      item
        ? {
            name: item.name,
            description: item.description ?? '',
            unit: item.unit,
            unit_price: Number(item.unit_price).toFixed(2),
            tax_rate: String(Number(item.tax_rate)),
            status: item.status,
          }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      description: values.description || null,
      unit: values.unit,
      unit_price: values.unit_price,
      tax_rate: values.tax_rate,
      status: values.status,
    };

    try {
      const saved = item ? await updateItem(item.id, payload) : await createItem(payload);
      revalidate('/items', '/dashboard', '/reports');
      toast.success(editing ? 'Item updated' : 'Item added', {
        description: editing
          ? 'Invoices already raised keep the price they were raised at.'
          : saved.name,
      });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.fields) {
          for (const [field, message] of Object.entries(error.fields)) {
            if (field in emptyValues) form.setError(field as keyof FormValues, { message });
          }
        }
        toast.error(error.message);
      } else {
        toast.error('The item could not be saved. Please try again.');
      }
    }
  });

  const { errors, isSubmitting } = form.formState;
  const taxRate = form.watch('tax_rate');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader
          title={editing ? 'Edit item' : 'Add an item'}
          description={
            editing
              ? 'New prices apply to new invoices only — invoices you have already raised are never rewritten.'
              : 'Anything you sell: a product, a material, or a service charged by the hour.'
          }
        />
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Item name"
              htmlFor="item-name"
              error={errors.name?.message}
              className="sm:col-span-2"
            >
              <Input
                id="item-name"
                autoFocus
                placeholder="Copper Wire 2.5 sq mm — 90 m coil"
                invalid={Boolean(errors.name)}
                {...form.register('name')}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="item-description"
              optional
              error={errors.description?.message}
              className="sm:col-span-2"
            >
              <Textarea
                id="item-description"
                rows={2}
                placeholder="FR PVC insulated, ISI marked"
                invalid={Boolean(errors.description)}
                {...form.register('description')}
              />
            </Field>

            <Field label="Unit price" htmlFor="item-price" error={errors.unit_price?.message}>
              <Input
                id="item-price"
                inputMode="decimal"
                numeric
                prefixLabel="₹"
                placeholder="0.00"
                invalid={Boolean(errors.unit_price)}
                {...form.register('unit_price')}
              />
            </Field>

            <Field label="Sold by" error={errors.unit?.message} hint="Shown on the invoice line.">
              <Select
                value={form.watch('unit')}
                onValueChange={(value) => form.setValue('unit', value)}
              >
                <SelectTrigger invalid={Boolean(errors.unit)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                  {form.watch('unit') && !UNITS.includes(form.watch('unit')) ? (
                    <SelectItem value={form.watch('unit')}>{form.watch('unit')}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="GST rate"
              error={errors.tax_rate?.message}
              hint="Applied to each line on the invoice."
            >
              <div className="flex flex-wrap gap-1.5">
                {GST_SLABS.map((slab) => (
                  <button
                    key={slab}
                    type="button"
                    onClick={() => form.setValue('tax_rate', slab, { shouldValidate: true })}
                    className={
                      taxRate === slab
                        ? 'tabular rounded border border-brand-600 bg-brand-50 px-2.5 py-1 text-small font-medium text-brand-700'
                        : 'tabular rounded border border-line-strong bg-surface px-2.5 py-1 text-small text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink'
                    }
                  >
                    {slab}%
                  </button>
                ))}
                <Input
                  aria-label="Custom GST rate"
                  inputMode="decimal"
                  numeric
                  className="h-7 w-16 text-small"
                  invalid={Boolean(errors.tax_rate)}
                  {...form.register('tax_rate')}
                />
              </div>
            </Field>

            <Field
              label="Status"
              error={errors.status?.message}
              hint="Inactive items stay on old invoices but cannot be added to new ones."
            >
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
