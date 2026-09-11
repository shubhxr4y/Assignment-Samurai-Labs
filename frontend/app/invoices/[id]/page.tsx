'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { IndianRupee, Pencil, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/page-header';
import { RecordPaymentDialog } from '@/components/app/record-payment-dialog';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentBadge } from '@/components/ui/status-badge';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { revalidate, useInvoice } from '@/hooks/use-api';
import { RequestError } from '@/lib/api';
import { formatDate, formatINR, formatPercent, formatQuantity } from '@/lib/format';
import { deleteInvoice } from '@/services/invoices';

const BUSINESS = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Your Business',
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? '',
  gstin: process.env.NEXT_PUBLIC_BUSINESS_GSTIN ?? '',
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? '',
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? '',
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? null;

  const { data: invoice, error, isLoading, mutate } = useInvoice(id);
  const [payOpen, setPayOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);

  const confirmDelete = async () => {
    if (!invoice) return;
    setDeletePending(true);
    try {
      await deleteInvoice(invoice.id);
      toast.success('Invoice deleted', { description: invoice.invoice_number });
      revalidate('/invoices', '/customers', '/items', '/dashboard', '/reports');
      router.push('/invoices');
    } catch (err) {
      toast.error(err instanceof RequestError ? err.message : 'The invoice could not be deleted.');
      setDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHeader title="Invoice" backHref="/invoices" backLabel="All invoices" />
        <Card>
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        </Card>
      </>
    );
  }

  if (isLoading || !invoice) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-8 w-56" />} backHref="/invoices" backLabel="All invoices" />
        <Card className="mx-auto max-w-4xl p-10">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-6 h-40 w-full" />
          <Skeleton className="mt-6 h-24 w-full" />
        </Card>
      </>
    );
  }

  const paidRatio =
    Number(invoice.total_amount) > 0
      ? Math.min(100, (Number(invoice.amount_paid) / Number(invoice.total_amount)) * 100)
      : 0;

  return (
    <>
      <div className="no-print">
        <PageHeader
          backHref="/invoices"
          backLabel="All invoices"
          title={
            <span className="tabular flex flex-wrap items-center gap-3">
              {invoice.invoice_number}
              <PaymentBadge status={invoice.payment_status} />
            </span>
          }
          description={`Raised for ${invoice.customer_name} on ${formatDate(invoice.invoice_date)}.`}
          action={
            <>
              <Button variant="ghost" size="icon" aria-label="Print" onClick={() => window.print()}>
                <Printer />
              </Button>
              <Button asChild>
                <Link href={`/invoices/${invoice.id}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
              {invoice.payment_status !== 'paid' ? (
                <Button variant="primary" onClick={() => setPayOpen(true)}>
                  <IndianRupee />
                  Record payment
                </Button>
              ) : (
                <Button onClick={() => setPayOpen(true)}>
                  <IndianRupee />
                  Adjust payment
                </Button>
              )}
            </>
          }
        />

        {Number(invoice.amount_pending) > 0 ? (
          <Card className="mb-5 border-partial-border bg-partial-bg/40">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-body font-medium text-ink">
                  <Amount value={invoice.amount_pending} paise muteZero={false} /> still to come in
                </p>
                <p className="mt-0.5 text-small text-ink-muted">
                  {formatINR(invoice.amount_paid, { paise: true })} of{' '}
                  {formatINR(invoice.total_amount, { paise: true })} received.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-partial-fg" style={{ width: `${paidRatio}%` }} />
                </div>
                <Button size="sm" onClick={() => setPayOpen(true)}>
                  Record payment
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* The document itself — what a customer would be shown.               */}
      {/* ------------------------------------------------------------------ */}
      <Card className="print-plain mx-auto max-w-4xl">
        <div className="flex flex-col gap-6 border-b border-line px-8 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-10">
          <div>
            <p className="font-serif text-title font-semibold text-ink">{BUSINESS.name}</p>
            {BUSINESS.address ? (
              <p className="mt-1 max-w-xs text-small leading-relaxed text-ink-muted">
                {BUSINESS.address}
              </p>
            ) : null}
            <div className="mt-2 space-y-0.5 text-small text-ink-muted">
              {BUSINESS.gstin ? <p className="tabular">GSTIN {BUSINESS.gstin}</p> : null}
              {BUSINESS.phone ? <p className="tabular">{BUSINESS.phone}</p> : null}
              {BUSINESS.email ? <p>{BUSINESS.email}</p> : null}
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-label uppercase text-ink-subtle">Tax invoice</p>
            <p className="tabular mt-1 font-serif text-title font-semibold text-ink">
              {invoice.invoice_number}
            </p>
            <dl className="mt-3 space-y-1 text-small">
              <div className="flex gap-3 sm:justify-end">
                <dt className="text-ink-subtle">Invoice date</dt>
                <dd className="tabular text-ink">{formatDate(invoice.invoice_date)}</dd>
              </div>
              <div className="flex gap-3 sm:justify-end">
                <dt className="text-ink-subtle">Status</dt>
                <dd>
                  <PaymentBadge status={invoice.payment_status} />
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="border-b border-line px-8 py-6 sm:px-10">
          <p className="text-label uppercase text-ink-subtle">Billed to</p>
          <p className="mt-2 text-lead font-medium text-ink">
            <Link href={`/customers/${invoice.customer_id}`} className="hover:text-brand-600">
              {invoice.customer_name}
            </Link>
          </p>
          {invoice.customer_address ? (
            <p className="mt-1 max-w-sm whitespace-pre-line text-small leading-relaxed text-ink-muted">
              {invoice.customer_address}
            </p>
          ) : null}
          <div className="mt-2 space-y-0.5 text-small text-ink-muted">
            {invoice.customer_gstin ? <p className="tabular">GSTIN {invoice.customer_gstin}</p> : null}
            {invoice.customer_phone ? <p className="tabular">{invoice.customer_phone}</p> : null}
            {invoice.customer_email ? <p>{invoice.customer_email}</p> : null}
          </div>
        </div>

        <div className="overflow-x-auto px-2 sm:px-4">
          <table className="w-full border-collapse text-body">
            <thead>
              <tr className="border-b border-line">
                <th className="w-8 px-4 py-3 text-left text-label uppercase text-ink-subtle">#</th>
                <th className="px-2 py-3 text-left text-label uppercase text-ink-subtle">Item</th>
                <th className="px-2 py-3 text-right text-label uppercase text-ink-subtle">Qty</th>
                <th className="px-2 py-3 text-right text-label uppercase text-ink-subtle">Rate</th>
                <th className="px-2 py-3 text-right text-label uppercase text-ink-subtle">GST</th>
                <th className="px-4 py-3 text-right text-label uppercase text-ink-subtle">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoice.items.map((line) => (
                <tr key={line.id}>
                  <td className="tabular px-4 py-3 align-top text-ink-subtle">{line.line_no}</td>
                  <td className="px-2 py-3 align-top">
                    <span className="font-medium text-ink">{line.item_name_snapshot}</span>
                  </td>
                  <td className="tabular whitespace-nowrap px-2 py-3 text-right align-top text-ink-muted">
                    {formatQuantity(line.quantity)} {line.item_unit_snapshot}
                  </td>
                  <td className="tabular px-2 py-3 text-right align-top text-ink-muted">
                    {formatINR(line.unit_price, { paise: true })}
                  </td>
                  <td className="tabular px-2 py-3 text-right align-top text-ink-muted">
                    {formatPercent(line.tax_rate)}
                    <span className="block text-small text-ink-subtle">
                      {formatINR(line.tax_amount, { paise: true })}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3 text-right align-top font-medium text-ink">
                    {formatINR(line.line_total, { paise: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-line px-8 py-6 sm:px-10">
          <dl className="w-full max-w-xs space-y-2.5 text-body">
            <TotalRow label="Subtotal" value={invoice.subtotal} />
            <TotalRow label="GST" value={invoice.tax_amount} />
            <div className="flex items-baseline justify-between border-t border-line pt-2.5">
              <dt className="font-medium text-ink">Total</dt>
              <dd className="tabular text-title font-semibold text-ink">
                {formatINR(invoice.total_amount, { paise: true })}
              </dd>
            </div>
            <TotalRow label="Amount received" value={invoice.amount_paid} />
            <div className="flex items-baseline justify-between border-t border-line pt-2.5">
              <dt className="font-medium text-ink">Amount pending</dt>
              <dd
                className={`tabular font-semibold ${
                  Number(invoice.amount_pending) > 0 ? 'text-partial-fg' : 'text-paid-fg'
                }`}
              >
                {formatINR(invoice.amount_pending, { paise: true })}
              </dd>
            </div>
          </dl>
        </div>

        {invoice.notes ? (
          <div className="border-t border-line px-8 py-6 sm:px-10">
            <p className="text-label uppercase text-ink-subtle">Notes</p>
            <p className="mt-2 whitespace-pre-line text-body text-ink-muted">{invoice.notes}</p>
          </div>
        ) : null}

        <div className="border-t border-line px-8 py-5 text-small text-ink-subtle sm:px-10">
          This is a computer-generated invoice. For any questions about it, get in touch with{' '}
          {BUSINESS.name}.
        </div>
      </Card>

      <div className="no-print mx-auto mt-5 flex max-w-4xl justify-end">
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 />
          Delete invoice
        </Button>
      </div>

      <RecordPaymentDialog
        invoice={invoice}
        open={payOpen}
        onOpenChange={setPayOpen}
        onRecorded={() => void mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete invoice ${invoice.invoice_number}?`}
        description="This removes the invoice and all of its line items from your books, and your sales figures will change. This cannot be undone."
        confirmLabel="Delete invoice"
        destructive
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular text-ink">{formatINR(value, { paise: true })}</dd>
    </div>
  );
}
