'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/page-header';
import { ItemFormDialog } from '@/components/app/item-form-dialog';
import { FilterTabs, SearchInput, Toolbar } from '@/components/app/list-toolbar';
import { RowActions } from '@/components/app/row-actions';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EntityBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { SortableTH, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { revalidate, useItems } from '@/hooks/use-api';
import { useDebounced } from '@/hooks/use-debounced';
import { RequestError } from '@/lib/api';
import { deleteItem, updateItem } from '@/services/items';
import { formatPercent, formatQuantity } from '@/lib/format';
import type { Item } from '@/types/api';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function ItemsPage() {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [sort, setSort] = React.useState('name');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [deleting, setDeleting] = React.useState<Item | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const debouncedSearch = useDebounced(search, 250);
  const { data, error, isLoading, mutate } = useItems({
    search: debouncedSearch,
    status,
    sort,
    order,
  });

  const toggleSort = (field: string) => {
    if (field === sort) setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(field);
      setOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteItem(deleting.id);
      toast.success('Item deleted', { description: deleting.name });
      revalidate('/items', '/dashboard', '/reports');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof RequestError ? err.message : 'The item could not be deleted.');
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  };

  const setItemStatus = async (item: Item, next: 'active' | 'inactive') => {
    try {
      await updateItem(item.id, { status: next });
      toast.success(next === 'inactive' ? 'Item marked inactive' : 'Item reactivated', {
        description:
          next === 'inactive'
            ? 'It will no longer appear when creating invoices.'
            : 'It can be added to invoices again.',
      });
      revalidate('/items', '/dashboard');
    } catch {
      toast.error('We could not update this item. Please try again.');
    }
  };

  const isFiltered = debouncedSearch !== '' || status !== 'all';

  return (
    <>
      <PageHeader
        title="Items"
        description="Products, materials and services you put on invoices."
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus />
            Add item
          </Button>
        }
      />

      <Card className="animate-fade-in-up">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search items"
            className="w-full sm:max-w-xs"
          />
          <FilterTabs<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
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
                    label="Item"
                    field="name"
                    active={sort === 'name'}
                    order={order}
                    onSort={toggleSort}
                  />
                  <SortableTH
                    label="Unit price"
                    field="unit_price"
                    active={sort === 'unit_price'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <SortableTH
                    label="GST"
                    field="tax_rate"
                    active={sort === 'tax_rate'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <TH>Status</TH>
                  <SortableTH
                    label="Sold"
                    field="quantity_sold"
                    active={sort === 'quantity_sold'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <SortableTH
                    label="Sales value"
                    field="total_sales"
                    active={sort === 'total_sales'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <TH className="w-12" />
                </TR>
              </THead>

              {isLoading ? (
                <TableSkeleton columns={7} />
              ) : (
                <TBody>
                  {data?.map((item) => (
                    <TR key={item.id} interactive>
                      <TD>
                        <Link
                          href={`/items/${item.id}`}
                          className="font-medium text-ink hover:text-brand-600"
                        >
                          {item.name}
                        </Link>
                        {item.description ? (
                          <span className="mt-0.5 block max-w-md truncate text-small text-ink-subtle">
                            {item.description}
                          </span>
                        ) : null}
                      </TD>
                      <TD numeric>
                        <Amount value={item.unit_price} strong paise />
                        <span className="block text-small text-ink-subtle">per {item.unit}</span>
                      </TD>
                      <TD numeric className="text-ink-muted">
                        {formatPercent(item.tax_rate)}
                      </TD>
                      <TD>
                        <EntityBadge status={item.status} />
                      </TD>
                      <TD numeric className="text-ink-muted">
                        {Number(item.quantity_sold) > 0
                          ? `${formatQuantity(item.quantity_sold)} ${item.unit}`
                          : '—'}
                      </TD>
                      <TD numeric>
                        <Amount value={item.total_sales} />
                      </TD>
                      <TD>
                        <RowActions>
                          <DropdownMenuItem asChild>
                            <Link href={`/items/${item.id}`}>
                              <Eye />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() =>
                              void setItemStatus(item, item.status === 'active' ? 'inactive' : 'active')
                            }
                          >
                            {item.status === 'active' ? 'Mark inactive' : 'Reactivate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setDeleting(item)}>
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
              icon={Package}
              title="No items match that"
              description="Try a different word, or clear the filters to see your whole catalogue."
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
              icon={Package}
              title="No items yet"
              description="Add the products and services you sell. You will pick from this list when creating an invoice."
              action={
                <Button variant="primary" onClick={openCreate}>
                  <Plus />
                  Add item
                </Button>
              }
            />
          )
        ) : null}
      </Card>

      <ItemFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'item'}?`}
        description={
          (deleting?.invoice_count ?? 0) > 0
            ? `This item appears on ${deleting?.invoice_count} invoice(s). Deleting it would change your sales history, so we will not allow it — mark it inactive instead and it will stop appearing on new invoices.`
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
