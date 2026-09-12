'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { CustomerFormDialog } from './customer-form-dialog';
import { ItemFormDialog } from './item-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { PaymentBadge } from '@/components/ui/status-badge';
import { revalidate, useCustomers, useItems, useNextInvoiceNumber } from '@/hooks/use-api';
import { RequestError } from '@/lib/api';
import { formatINR, todayISO } from '@/lib/format';
import { calculateLine, fromPaise, previewPaymentStatus, sumLines, toPaise } from '@/lib/money';
import { createInvoice, updateInvoice } from '@/services/invoices';
import type { Invoice } from '@/types/api';

const decimal = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), { message });

const lineSchema = z.object({
  item_id: z.string().uuid('Please pick an item for every line.'),
  quantity: decimal('Enter a quantity.').refine((value) => Number(value) > 0, {
    message: 'Quantity must be more than zero.',
  }),
  unit_price: decimal('Enter a unit price.'),
  tax_rate: decimal('Enter a GST rate.').refine((value) => Number(value) <= 100, {
    message: 'GST cannot be more than 100%.',
  }),
});

const schema = z.object({
  invoice_number: z.string().trim().min(1, 'Please enter an invoice number.').max(40),
  invoice_date: z.string().trim().min(1, 'Please choose an invoice date.'),
  customer_id: z.string().uuid('Please select a customer.'),
  notes: z.string().trim().max(1000),
  amount_paid: decimal('Enter 0 if nothing has been received yet.'),
  lines: z.array(lineSchema).min(1, 'Please add at least one item to the invoice.'),
});

type FormValues = z.infer<typeof schema>;

const emptyLine = { item_id: '', quantity: '1', unit_price: '', tax_rate: '' };

export function InvoiceForm({
  invoice,
  initialCustomerId,
}: {
  invoice?: Invoice | null;
  /** Pre-selects a customer when arriving from their detail page. */
  initialCustomerId?: string | null;
}) {
  const editing = Boolean(invoice);
  const router = useRouter();

  const { data: customers } = useCustomers({ status: 'all', sort: 'name', order: 'asc' });
  const { data: items } = useItems({ status: 'all', sort: 'name', order: 'asc' });
  const { data: suggestedNumber } = useNextInvoiceNumber(todayISO(), !editing);

  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_number: invoice?.invoice_number ?? '',
      invoice_date: invoice?.invoice_date?.slice(0, 10) ?? todayISO(),
      customer_id: invoice?.customer_id ?? initialCustomerId ?? '',
      notes: invoice?.notes ?? '',
      amount_paid: invoice ? Number(invoice.amount_paid).toFixed(2) : '0',
      lines: invoice?.items.length
        ? invoice.items.map((line) => ({
            item_id: line.item_id ?? '',
            quantity: String(Number(line.quantity)),
            unit_price: Number(line.unit_price).toFixed(2),
            tax_rate: String(Number(line.tax_rate)),
          }))
        : [{ ...emptyLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });

  // Fill in the suggested number once it arrives, without stamping over typing.
  React.useEffect(() => {
    if (!editing && suggestedNumber && !form.getValues('invoice_number')) {
      form.setValue('invoice_number', suggestedNumber.invoice_number);
    }
  }, [editing, suggestedNumber, form]);

  const watchedLines = form.watch('lines');
  const amountPaidInput = form.watch('amount_paid');

  const totals = React.useMemo(() => {
    const amounts = (watchedLines ?? []).map((line) =>
      calculateLine({
        quantity: line?.quantity || '0',
        unitPrice: line?.unit_price || '0',
        taxRate: line?.tax_rate || '0',
      }),
    );
    return { lines: amounts, ...sumLines(amounts) };
  }, [watchedLines]);

  const amountPaidPaise = toPaise(amountPaidInput || '0');
  const overpaid = amountPaidPaise > totals.totalAmount;
  const pendingPaise = totals.totalAmount - (overpaid ? totals.totalAmount : amountPaidPaise);
  const previewStatus = previewPaymentStatus(totals.totalAmount, amountPaidPaise);

  const usedItemIds = new Set((watchedLines ?? []).map((line) => line?.item_id).filter(Boolean));

  const customerOptions: ComboboxOption[] = (customers ?? [])
    .filter((customer) => customer.status === 'active' || customer.id === invoice?.customer_id)
    .map((customer) => ({
      value: customer.id,
      label: customer.name,
      description:
        customer.status === 'inactive'
          ? 'Inactive'
          : (customer.phone ?? customer.email ?? undefined),
      keywords: [customer.email ?? '', customer.phone ?? ''],
    }));

  /** Active items, plus anything already sitting on this invoice. */
  const itemOptions: ComboboxOption[] = (items ?? [])
    .filter((item) => item.status === 'active' || usedItemIds.has(item.id))
    .map((item) => ({
      value: item.id,
      label: item.name,
      description:
        item.status === 'inactive'
          ? 'Inactive — remove before saving'
          : (item.description ?? `per ${item.unit}`),
      meta: formatINR(item.unit_price),
      keywords: [item.description ?? ''],
    }));

  const applyItemDefaults = (index: number, itemId: string) => {
    const item = items?.find((candidate) => candidate.id === itemId);
    form.setValue(`lines.${index}.item_id`, itemId, { shouldValidate: true });
    if (item) {
      form.setValue(`lines.${index}.unit_price`, Number(item.unit_price).toFixed(2));
      form.setValue(`lines.${index}.tax_rate`, String(Number(item.tax_rate)));
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (overpaid) {
      form.setError('amount_paid', {
        message: 'The amount received cannot be more than the invoice total.',
      });
      return;
    }

    const payload = {
      invoice_number: values.invoice_number,
      customer_id: values.customer_id,
      invoice_date: values.invoice_date,
      notes: values.notes || null,
      amount_paid: values.amount_paid || '0',
      items: values.lines.map((line) => ({
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
      })),
    };

    try {
      const saved = invoice
        ? await updateInvoice(invoice.id, payload)
        : await createInvoice(payload);
      revalidate('/invoices', '/customers', '/items', '/dashboard', '/reports');
      toast.success(editing ? 'Invoice updated' : 'Invoice created', {
        description: `${saved.invoice_number} · ${formatINR(saved.total_amount)}`,
      });
      router.push(`/invoices/${saved.id}`);
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.code === 'DUPLICATE_INVOICE_NUMBER') {
          form.setError('invoice_number', { message: error.message });
        }
        if (error.fields?.amount_paid) {
          form.setError('amount_paid', { message: error.fields.amount_paid });
        }
        toast.error(error.message);
      } else {
        toast.error('The invoice could not be saved. Please try again.');
      }
    }
  });

  const { errors, isSubmitting } = form.formState;

  // A whole-array error ("add at least one item") is reported on the array itself.
  const linesError = errors.lines as unknown as
    | { root?: { message?: string }; message?: string }
    | undefined;
  const linesMessage = linesError?.root?.message ?? linesError?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader title="Invoice details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Invoice number"
              htmlFor="invoice-number"
              error={errors.invoice_number?.message}
              hint="Suggested from your running series — change it if you keep your own."
            >
              <Input
                id="invoice-number"
                className="tabular"
                placeholder="INV-2026-27-0001"
                invalid={Boolean(errors.invoice_number)}
                {...form.register('invoice_number')}
              />
            </Field>

            <Field
              label="Invoice date"
              htmlFor="invoice-date"
              error={errors.invoice_date?.message}
            >
              <Input
                id="invoice-date"
                type="date"
                invalid={Boolean(errors.invoice_date)}
                {...form.register('invoice_date')}
              />
            </Field>

            <Field
              label="Customer"
              error={errors.customer_id?.message}
              className="sm:col-span-2"
            >
              <Combobox
                options={customerOptions}
                value={form.watch('customer_id') || null}
                onChange={(value) =>
                  form.setValue('customer_id', value, { shouldValidate: true })
                }
                placeholder="Select a customer"
                searchPlaceholder="Search customers"
                emptyMessage="No customers match that."
                invalid={Boolean(errors.customer_id)}
                onCreate={() => setCustomerDialogOpen(true)}
                createLabel="Add a new customer"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Items"
            description="Pick an item and the price and GST fill in — change either one just for this invoice."
            action={
              <Button type="button" size="sm" onClick={() => append({ ...emptyLine })}>
                <Plus />
                Add item
              </Button>
            }
          />

          {fields.length === 0 ? (
            <CardBody className="py-10 text-center">
              <p className="text-body font-medium text-ink">This invoice has no items yet</p>
              <p className="mx-auto mt-1 max-w-sm text-small text-ink-muted">
                Add at least one item — the totals are worked out from what you add here.
              </p>
              <Button
                type="button"
                variant="primary"
                className="mt-4"
                onClick={() => append({ ...emptyLine })}
              >
                <Plus />
                Add the first item
              </Button>
            </CardBody>
          ) : (
            <div>
              <div className="hidden gap-3 border-b border-line px-5 py-2 text-label uppercase text-ink-subtle md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_8rem_5rem_8rem_2rem]">
                <span>Item</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit price</span>
                <span className="text-right">GST</span>
                <span className="text-right">Line total</span>
                <span />
              </div>

              <div className="divide-y divide-line">
                {fields.map((field, index) => {
                  const lineErrors = errors.lines?.[index];
                  const amounts = totals.lines[index];
                  const rowItem = items?.find(
                    (candidate) => candidate.id === watchedLines?.[index]?.item_id,
                  );

                  return (
                    <div
                      key={field.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_5.5rem_8rem_5rem_8rem_2rem] md:items-start"
                    >
                      <div>
                        <span className="mb-1 block text-small text-ink-muted md:hidden">Item</span>
                        <Combobox
                          options={itemOptions}
                          value={watchedLines?.[index]?.item_id || null}
                          onChange={(value) => applyItemDefaults(index, value)}
                          placeholder="Select an item"
                          searchPlaceholder="Search items"
                          emptyMessage="No items match that."
                          invalid={Boolean(lineErrors?.item_id)}
                          onCreate={() => setItemDialogOpen(true)}
                          createLabel="Add a new item"
                        />
                        {lineErrors?.item_id ? (
                          <p className="mt-1 text-small text-danger-fg">
                            {lineErrors.item_id.message}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <span className="mb-1 block text-small text-ink-muted md:hidden">
                          Quantity
                        </span>
                        <Input
                          aria-label={`Quantity for line ${index + 1}`}
                          inputMode="decimal"
                          numeric
                          invalid={Boolean(lineErrors?.quantity)}
                          {...form.register(`lines.${index}.quantity`)}
                        />
                        {rowItem ? (
                          <span className="mt-1 block text-right text-small text-ink-subtle">
                            {rowItem.unit}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <span className="mb-1 block text-small text-ink-muted md:hidden">
                          Unit price
                        </span>
                        <Input
                          aria-label={`Unit price for line ${index + 1}`}
                          inputMode="decimal"
                          numeric
                          prefixLabel="₹"
                          invalid={Boolean(lineErrors?.unit_price)}
                          {...form.register(`lines.${index}.unit_price`)}
                        />
                      </div>

                      <div>
                        <span className="mb-1 block text-small text-ink-muted md:hidden">GST</span>
                        <Input
                          aria-label={`GST rate for line ${index + 1}`}
                          inputMode="decimal"
                          numeric
                          invalid={Boolean(lineErrors?.tax_rate)}
                          {...form.register(`lines.${index}.tax_rate`)}
                        />
                      </div>

                      <div className="md:pt-2">
                        <span className="mb-1 block text-small text-ink-muted md:hidden">
                          Line total
                        </span>
                        <p className="tabular text-right font-medium text-ink">
                          {formatINR(fromPaise(amounts?.lineTotal ?? 0n), { paise: true })}
                        </p>
                        {amounts && amounts.taxAmount > 0n ? (
                          <p className="tabular text-right text-small text-ink-subtle">
                            incl. {formatINR(fromPaise(amounts.taxAmount), { paise: true })} GST
                          </p>
                        ) : null}
                      </div>

                      <div className="flex justify-end md:pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove line ${index + 1}`}
                          onClick={() => remove(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {linesMessage ? (
                <p className="px-5 pb-4 text-small text-danger-fg">{linesMessage}</p>
              ) : null}

              <div className="border-t border-line px-5 py-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => append({ ...emptyLine })}>
                  <Plus />
                  Add another item
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Notes" description="Anything the customer should see on the invoice." />
          <CardBody>
            <Textarea
              rows={3}
              placeholder="Delivery by 20 September. Payment within 30 days."
              invalid={Boolean(errors.notes)}
              {...form.register('notes')}
            />
          </CardBody>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6 space-y-5">
          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-3">
              <SummaryRow label="Subtotal" value={fromPaise(totals.subtotal)} />
              <SummaryRow label="GST" value={fromPaise(totals.taxAmount)} />
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-body font-medium text-ink">Total</span>
                <span className="tabular text-title font-semibold text-ink">
                  {formatINR(fromPaise(totals.totalAmount), { paise: true })}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment" description="Record anything received so far." />
            <CardBody className="space-y-4">
              <Field label="Amount received" error={errors.amount_paid?.message}>
                <Input
                  inputMode="decimal"
                  numeric
                  prefixLabel="₹"
                  invalid={Boolean(errors.amount_paid) || overpaid}
                  {...form.register('amount_paid')}
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => form.setValue('amount_paid', '0', { shouldValidate: true })}
                >
                  Nothing yet
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    form.setValue('amount_paid', fromPaise(totals.totalAmount), {
                      shouldValidate: true,
                    })
                  }
                >
                  Paid in full
                </Button>
              </div>

              {overpaid ? (
                <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-small text-danger-fg">
                  That is more than the invoice total. Record only what you have actually received.
                </p>
              ) : null}

              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-small text-ink-muted">Still pending</span>
                <span className="tabular font-medium text-ink">
                  {formatINR(fromPaise(pendingPaise), { paise: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-small text-ink-muted">Status</span>
                <PaymentBadge status={previewStatus} />
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Create invoice'}
            </Button>
            <Button asChild variant="ghost">
              <Link href={invoice ? `/invoices/${invoice.id}` : '/invoices'}>Cancel</Link>
            </Button>
          </div>
        </div>
      </div>

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSaved={(customer) => form.setValue('customer_id', customer.id, { shouldValidate: true })}
      />
      <ItemFormDialog open={itemDialogOpen} onOpenChange={setItemDialogOpen} />
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-body text-ink-muted">{label}</span>
      <span className="tabular text-body text-ink">{formatINR(value, { paise: true })}</span>
    </div>
  );
}
