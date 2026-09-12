'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, FileText, IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/page-header';
import { FilterTabs, SearchInput, Toolbar } from '@/components/app/list-toolbar';
import { RecordPaymentDialog } from '@/components/app/record-payment-dialog';
import { RowActions } from '@/components/app/row-actions';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PaymentBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { SortableTH, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { revalidate, useInvoices } from '@/hooks/use-api';
import { useDebounced } from '@/hooks/use-debounced';
import { RequestError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { deleteInvoice } from '@/services/invoices';
import type { InvoiceSummary, PaymentStatus } from '@/types/api';

type StatusFilter = PaymentStatus | 'all';

export default function InvoicesPage() {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [sort, setSort] = React.useState('invoice_date');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');

  const [paying, setPaying] = React.useState<InvoiceSummary | null>(null);
  const [deleting, setDeleting] = React.useState<InvoiceSummary | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const debouncedSearch = useDebounced(search, 250);
  const { data, error, isLoading, mutate } = useInvoices({
    search: debouncedSearch,
    status,
    sort,
    order,
  });

  const toggleSort = (field: string) => {
    if (field === sort) setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(field);
      setOrder('desc');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteInvoice(deleting.id);
      toast.success('Invoice deleted', { description: deleting.invoice_number });
      revalidate('/invoices', '/customers', '/items', '/dashboard', '/reports');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof RequestError ? err.message : 'The invoice could not be deleted.');
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  };

  const isFiltered = debouncedSearch !== '' || status !== 'all';

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Everything you have billed, and what is still to come in."
        action={
          <Button asChild variant="primary">
            <Link href="/invoices/new">
              <Plus />
              Create invoice
            </Link>
          </Button>
        }
      />

      <Card className="animate-fade-in-up">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by invoice number or customer"
            className="w-full sm:max-w-sm"
          />
          <FilterTabs<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'partially_paid', label: 'Partially paid' },
              { value: 'paid', label: 'Paid' },
            ]}
          />
        </Toolbar>

        {error ? (
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <SortableTH
                    label="Invoice"
                    field="invoice_number"
                    active={sort === 'invoice_number'}
                    order={order}
                    onSort={toggleSort}
                  />
                  <SortableTH
                    label="Customer"
                    field="customer_name"
                    active={sort === 'customer_name'}
                    order={order}
                    onSort={toggleSort}
                  />
                  <SortableTH
                    label="Date"
                    field="invoice_date"
                    active={sort === 'invoice_date'}
                    order={order}
                    onSort={toggleSort}
                  />
                  <SortableTH
                    label="Total"
                    field="total_amount"
                    active={sort === 'total_amount'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <TH numeric>Received</TH>
                  <SortableTH
                    label="Pending"
                    field="amount_pending"
                    active={sort === 'amount_pending'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <TH>Status</TH>
                  <TH className="w-12" />
                </TR>
              </THead>

              {isLoading ? (
                <TableSkeleton columns={8} />
              ) : (
                <TBody>
                  {data?.map((invoice) => (
                    <TR key={invoice.id} interactive>
                      <TD>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="tabular font-medium text-ink hover:text-brand-600"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </TD>
                      <TD>
                        <Link
                          href={`/customers/${invoice.customer_id}`}
                          className="block max-w-52 truncate text-ink-muted hover:text-brand-600"
                        >
                          {invoice.customer_name}
                        </Link>
                      </TD>
                      <TD className="whitespace-nowrap text-ink-muted">
                        {formatDate(invoice.invoice_date)}
                      </TD>
                      <TD numeric>
                        <Amount value={invoice.total_amount} strong />
                      </TD>
                      <TD numeric>
                        <Amount value={invoice.amount_paid} />
                      </TD>
                      <TD numeric>
                        <Amount
                          value={invoice.amount_pending}
                          className={Number(invoice.amount_pending) > 0 ? 'text-partial-fg' : ''}
                        />
                      </TD>
                      <TD>
                        <PaymentBadge status={invoice.payment_status} />
                      </TD>
                      <TD>
                        <RowActions>
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${invoice.id}`}>
                              <Eye />
                              View invoice
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setPaying(invoice)}>
                            <IndianRupee />
                            Record payment
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${invoice.id}/edit`}>
                              <Pencil />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setDeleting(invoice)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </RowActions>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              )}
            </Table>
          </TableWrap>
        )}

        {!isLoading && !error && (data?.length ?? 0) === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={FileText}
              title="No invoices match that"
              description="Try another invoice number or customer, or clear the filters."
              action={
                <Button
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice — pick a customer, add a few items, and the totals work themselves out."
              action={
                <Button asChild variant="primary">
                  <Link href="/invoices/new">
                    <Plus />
                    Create invoice
                  </Link>
                </Button>
              }
            />
          )
        ) : null}
      </Card>

      <RecordPaymentDialog
        invoice={paying}
        open={Boolean(paying)}
        onOpenChange={(open) => !open && setPaying(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete invoice ${deleting?.invoice_number ?? ''}?`}
        description={
          <>
            This removes the invoice and all of its line items from your books, and your sales
            figures will change. This cannot be undone.
            {Number(deleting?.amount_paid ?? 0) > 0 ? (
              <span className="mt-2 block font-medium text-ink">
                Note: this invoice already has payments recorded against it.
              </span>
            ) : null}
          </>
        }
        confirmLabel="Delete invoice"
        destructive
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
