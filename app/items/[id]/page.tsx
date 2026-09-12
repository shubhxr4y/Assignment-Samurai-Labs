'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { IndianRupee, Package, Pencil, Percent, Receipt, Ruler, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/page-header';
import { ItemFormDialog } from '@/components/app/item-form-dialog';
import { StatTile } from '@/components/app/stat-tile';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EntityBadge, PaymentBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { revalidate, useItem, useItemInvoices } from '@/hooks/use-api';
import { RequestError } from '@/lib/api';
import { deleteItem, updateItem } from '@/services/items';
import { formatDate, formatPercent, formatQuantity } from '@/lib/format';

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? null;

  const { data: item, error, isLoading, mutate } = useItem(id);
  const { data: history, isLoading: historyLoading } = useItemInvoices(id);

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);

  const confirmDelete = async () => {
    if (!item) return;
    setDeletePending(true);
    try {
      await deleteItem(item.id);
      toast.success('Item deleted', { description: item.name });
      revalidate('/items', '/dashboard', '/reports');
      router.push('/items');
    } catch (err) {
      toast.error(err instanceof RequestError ? err.message : 'The item could not be deleted.');
      setDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  };

  const toggleStatus = async () => {
    if (!item) return;
    const next = item.status === 'active' ? 'inactive' : 'active';
    try {
      await updateItem(item.id, { status: next });
      toast.success(next === 'inactive' ? 'Item marked inactive' : 'Item reactivated', {
        description:
          next === 'inactive'
            ? 'It will no longer appear when creating invoices.'
            : 'It can be added to invoices again.',
      });
      revalidate('/items', '/dashboard');
      void mutate();
    } catch {
      toast.error('We could not update this item. Please try again.');
    }
  };

  if (error) {
    return (
      <>
        <PageHeader title="Item" backHref="/items" backLabel="All items" />
        <Card>
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        </Card>
      </>
    );
  }

  const invoiced = item ? Number(item.invoice_count) : 0;

  return (
    <>
      <PageHeader
        backHref="/items"
        backLabel="All items"
        title={
          isLoading ? (
            <Skeleton className="h-8 w-64" />
          ) : (
            <span className="flex flex-wrap items-center gap-3">
              {item?.name}
              {item ? <EntityBadge status={item.status} /> : null}
            </span>
          )
        }
        description={item?.description ?? undefined}
        action={
          <>
            <Button onClick={() => void toggleStatus()} disabled={!item}>
              {item?.status === 'active' ? 'Mark inactive' : 'Reactivate'}
            </Button>
            <Button variant="primary" onClick={() => setEditOpen(true)} disabled={!item}>
              <Pencil />
              Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Quantity sold"
          value={item?.quantity_sold}
          format="count"
          loading={isLoading}
          hint={item ? `Across ${invoiced} invoice${invoiced === 1 ? '' : 's'}` : undefined}
        />
        <StatTile label="Sales value" value={item?.total_sales} loading={isLoading} />
        <StatTile
          label="Current price"
          value={item?.unit_price}
          loading={isLoading}
          hint={item ? `Per ${item.unit} · ${formatPercent(item.tax_rate)} GST` : undefined}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Item details" />
          <CardBody className="space-y-3.5 text-body">
            {isLoading ? (
              <>
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
                <Skeleton className="h-5 w-2/3" />
              </>
            ) : (
              <>
                <DetailRow
                  icon={IndianRupee}
                  label="Unit price"
                  value={<Amount value={item?.unit_price} strong paise />}
                />
                <DetailRow icon={Ruler} label="Sold by" value={item?.unit ?? '—'} />
                <DetailRow
                  icon={Percent}
                  label="GST rate"
                  value={item ? formatPercent(item.tax_rate) : '—'}
                />
                <DetailRow icon={Package} label="Description" value={item?.description || '—'} />
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Sales history"
            description={
              invoiced > 0
                ? 'Every invoice this item has appeared on. Each line keeps the price it was billed at.'
                : undefined
            }
          />
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Invoice</TH>
                  <TH>Date</TH>
                  <TH>Customer</TH>
                  <TH numeric>Qty</TH>
                  <TH numeric>Unit price</TH>
                  <TH numeric>Line total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              {historyLoading ? (
                <TableSkeleton columns={7} rows={4} />
              ) : (
                <TBody>
                  {history?.map((line) => (
                    <TR key={line.line_id} interactive>
                      <TD className="font-medium">
                        <Link href={`/invoices/${line.invoice_id}`} className="hover:text-brand-600">
                          {line.invoice_number}
                        </Link>
                      </TD>
                      <TD className="whitespace-nowrap text-ink-muted">
                        {formatDate(line.invoice_date)}
                      </TD>
                      <TD>
                        <Link
                          href={`/customers/${line.customer_id}`}
                          className="text-ink hover:text-brand-600"
                        >
                          {line.customer_name}
                        </Link>
                      </TD>
                      <TD numeric className="tabular text-ink-muted">
                        {formatQuantity(line.quantity)}
                      </TD>
                      <TD numeric>
                        <Amount value={line.unit_price} paise />
                      </TD>
                      <TD numeric>
                        <Amount value={line.line_total} strong />
                      </TD>
                      <TD>
                        <PaymentBadge status={line.payment_status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              )}
            </Table>
          </TableWrap>
          {!historyLoading && (history?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Receipt}
              title="This item has not been sold yet"
              description="Once it goes on an invoice, every sale will be listed here with the price it was billed at."
              action={
                <Button asChild variant="primary">
                  <Link href="/invoices/new">Create invoice</Link>
                </Button>
              }
            />
          ) : null}
        </Card>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={!item}>
          <Trash2 />
          Delete item
        </Button>
      </div>

      <ItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item ?? null}
        onSaved={() => void mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${item?.name ?? 'item'}?`}
        description={
          invoiced > 0
            ? `This item appears on ${invoiced} invoice${invoiced === 1 ? '' : 's'}. Deleting it would change those invoices, so we will not allow it — mark it inactive instead and it will stop showing up on new ones.`
            : 'This cannot be undone. The item has never been invoiced, so nothing else will be affected.'
        }
        confirmLabel="Delete item"
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
      <div className="min-w-0">
        <p className="text-small text-ink-subtle">{label}</p>
        <div className="break-words text-ink">{value}</div>
      </div>
    </div>
  );
}
