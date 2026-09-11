'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PaymentBadge } from '@/components/ui/status-badge';
import { revalidate } from '@/hooks/use-api';
import { RequestError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { previewPaymentStatus, toPaise } from '@/lib/money';
import { recordPayment } from '@/services/invoices';
import type { InvoiceSummary } from '@/types/api';

/**
 * Records the *total* received against an invoice, not a delta. Small
 * businesses correct mistakes constantly ("I typed 5,000 instead of 50,000"),
 * and an absolute figure is the one they can always check against the bank.
 */
export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onRecorded,
}: {
  invoice: InvoiceSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}) {
  const [value, setValue] = React.useState('0');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open && invoice) {
      setValue(Number(invoice.amount_paid).toFixed(2));
      setError(null);
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const totalPaise = toPaise(invoice.total_amount);
  const enteredPaise = /^\d+(\.\d{1,2})?$/.test(value.trim()) ? toPaise(value) : null;
  const invalid = enteredPaise === null;
  const overpaid = enteredPaise !== null && enteredPaise > totalPaise;
  const previewStatus = previewPaymentStatus(totalPaise, enteredPaise ?? 0n);

  const submit = async () => {
    if (invalid) {
      setError('Enter an amount, for example 25000 or 25000.50.');
      return;
    }
    if (overpaid) {
      setError('The amount received cannot be more than the invoice total.');
      return;
    }

    setPending(true);
    try {
      await recordPayment(invoice.id, { amount_paid: value.trim() });
      revalidate('/invoices', '/customers', '/dashboard', '/reports');
      toast.success('Payment recorded', {
        description: `${invoice.invoice_number} · ${formatINR(value)} received in total`,
      });
      onOpenChange(false);
      onRecorded?.();
    } catch (err) {
      const message =
        err instanceof RequestError ? err.message : 'The payment could not be recorded.';
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Record payment"
          description={`${invoice.invoice_number} · ${invoice.customer_name}`}
        />
        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-line bg-paper px-4 py-3">
            <span className="text-small text-ink-muted">Invoice total</span>
            <Amount value={invoice.total_amount} paise strong muteZero={false} />
          </div>

          <Field
            label="Total received so far"
            error={error ?? undefined}
            hint="Enter the full amount received against this invoice, not just today’s payment."
          >
            <Input
              autoFocus
              inputMode="decimal"
              numeric
              prefixLabel="₹"
              value={value}
              invalid={Boolean(error) || overpaid}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setValue('0')}>
              Nothing received
            </Button>
            <Button size="sm" onClick={() => setValue(Number(invoice.total_amount).toFixed(2))}>
              Paid in full
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-small text-ink-muted">Status after saving</span>
            <PaymentBadge status={previewStatus} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={() => void submit()}>
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
