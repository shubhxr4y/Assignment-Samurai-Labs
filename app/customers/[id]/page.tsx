'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FilePlus2, Mail, MapPin, Pencil, Phone, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/page-header';
import { CustomerFormDialog } from '@/components/app/customer-form-dialog';
import { StatTile } from '@/components/app/stat-tile';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EntityBadge, PaymentBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { revalidate, useCustomer, useInvoices } from '@/hooks/use-api';
import { RequestError } from '@/lib/api';
import { deleteCustomer } from '@/services/customers';
import { formatDate } from '@/lib/format';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? null;

  const { data: customer, error, isLoading, mutate } = useCustomer(id);
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(
    id ? { customer_id: id } : {},
  );

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);

  const confirmDelete = async () => {
    if (!customer) return;
    setDeletePending(true);
    try {
      await deleteCustomer(customer.id);
      toast.success('Customer deleted', { description: customer.name });
      revalidate('/customers', '/dashboard', '/reports');
      router.push('/customers');
    } catch (err) {
      toast.error(
        err instanceof RequestError ? err.message : 'The customer could not be deleted.',
      );
      setDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHeader title="Customer" backHref="/customers" backLabel="All customers" />
        <Card>
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref="/customers"
        backLabel="All customers"
        title={
          isLoading ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <span className="flex flex-wrap items-center gap-3">
              {customer?.name}
              {customer ? <EntityBadge status={customer.status} /> : null}
            </span>
          )
        }
        description={customer?.gstin ? `GSTIN ${customer.gstin}` : undefined}
        action={
          <>
            <Button onClick={() => setEditOpen(true)} disabled={!customer}>
              <Pencil />
              Edit
            </Button>
            <Button asChild variant="primary">
              <Link href={`/invoices/new?customer=${id ?? ''}`}>
                <FilePlus2 />
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total invoiced" value={customer?.total_sales} loading={isLoading} />
        <StatTile
          label="Received"
          value={
            customer ? String(Number(customer.total_sales) - Number(customer.total_pending)) : null
          }
          tone="positive"
          loading={isLoading}
        />
        <StatTile
          label="Outstanding"
          value={customer?.total_pending}
          tone="attention"
          loading={isLoading}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Contact details" />
          <CardBody className="space-y-3.5 text-body">
            {isLoading ? (
              <>
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
                <Skeleton className="h-5 w-2/3" />
              </>
            ) : (
              <>
                <DetailRow icon={Mail} label="Email" value={customer?.email} />
                <DetailRow icon={Phone} label="Phone" value={customer?.phone} tabular />
                <DetailRow icon={MapPin} label="Address" value={customer?.address} />
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Invoices"
            description={
              customer
                ? `${customer.invoice_count} invoice${customer.invoice_count === 1 ? '' : 's'} raised for this customer.`
                : undefined
            }
          />
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Invoice</TH>
                  <TH>Date</TH>
                  <TH numeric>Total</TH>
                  <TH numeric>Received</TH>
                  <TH numeric>Pending</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              {invoicesLoading ? (
                <TableSkeleton columns={6} rows={4} />
              ) : (
                <TBody>
                  {invoices?.map((invoice) => (
                    <TR key={invoice.id} interactive>
                      <TD className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="hover:text-brand-600">
                          {invoice.invoice_number}
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
                        <Amount value={invoice.amount_pending} />
                      </TD>
                      <TD>
                        <PaymentBadge status={invoice.payment_status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              )}
            </Table>
          </TableWrap>
          {!invoicesLoading && (invoices?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices for this customer yet"
              description="Raise one and it will show up here, along with what they still owe."
              action={
                <Button asChild variant="primary">
                  <Link href={`/invoices/new?customer=${id ?? ''}`}>Create invoice</Link>
                </Button>
              }
            />
          ) : null}
        </Card>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={!customer}>
          <Trash2 />
          Delete customer
        </Button>
      </div>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer ?? null}
        onSaved={() => void mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${customer?.name ?? 'customer'}?`}
        description={
          (customer?.invoice_count ?? 0) > 0
            ? `This customer has ${customer?.invoice_count} invoice(s) on record. Deleting them would break those invoices, so we will not allow it — mark them inactive instead.`
            : 'This cannot be undone. The customer has no invoices, so nothing else will be affected.'
        }
        confirmLabel="Delete customer"
        destructive
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  tabular,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  tabular?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
      <div className="min-w-0">
        <p className="text-small text-ink-subtle">{label}</p>
        <p className={`break-words text-ink ${tabular ? 'tabular' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  );
}
