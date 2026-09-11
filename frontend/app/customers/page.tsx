'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, FilePlus2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/page-header';
import { CustomerFormDialog } from '@/components/app/customer-form-dialog';
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
import { useCustomers, revalidate } from '@/hooks/use-api';
import { RequestError } from '@/lib/api';
import { deleteCustomer, updateCustomer } from '@/services/customers';
import { useDebounced } from '@/hooks/use-debounced';
import type { Customer } from '@/types/api';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function CustomersPage() {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [sort, setSort] = React.useState('name');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState<Customer | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const debouncedSearch = useDebounced(search, 250);
  const { data, error, isLoading, mutate } = useCustomers({
    search: debouncedSearch,
    status,
    sort,
    order,
  });

  const toggleSort = (field: string) => {
    if (field === sort) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
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
      await deleteCustomer(deleting.id);
      toast.success('Customer deleted', { description: deleting.name });
      setDeleting(null);
      revalidate('/customers', '/dashboard', '/reports');
    } catch (err) {
      const message =
        err instanceof RequestError ? err.message : 'The customer could not be deleted.';
      toast.error(message);
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  };

  const deactivate = async (customer: Customer) => {
    try {
      await updateCustomer(customer.id, { status: 'inactive' });
      toast.success('Customer marked inactive', {
        description: 'Their invoices are untouched. They will not appear on new invoices.',
      });
      revalidate('/customers', '/dashboard');
    } catch {
      toast.error('We could not update this customer. Please try again.');
    }
  };

  const isFiltered = debouncedSearch !== '' || status !== 'all';

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you invoice, and what each of them is worth."
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus />
            Create customer
          </Button>
        }
      />

      <Card>
        <Toolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email or phone"
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
                    label="Customer"
                    field="name"
                    active={sort === 'name'}
                    order={order}
                    onSort={toggleSort}
                  />
                  <TH>Contact</TH>
                  <TH>Status</TH>
                  <SortableTH
                    label="Invoices"
                    field="invoice_count"
                    active={sort === 'invoice_count'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <SortableTH
                    label="Total sales"
                    field="total_sales"
                    active={sort === 'total_sales'}
                    order={order}
                    onSort={toggleSort}
                    numeric
                  />
                  <SortableTH
                    label="Outstanding"
                    field="total_pending"
                    active={sort === 'total_pending'}
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
                  {data?.map((customer) => (
                    <TR key={customer.id} interactive>
                      <TD>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-ink hover:text-brand-600"
                        >
                          {customer.name}
                        </Link>
                        {customer.gstin ? (
                          <span className="tabular mt-0.5 block text-small text-ink-subtle">
                            {customer.gstin}
                          </span>
                        ) : null}
                      </TD>
                      <TD className="text-ink-muted">
                        <span className="block max-w-52 truncate">{customer.email ?? '—'}</span>
                        <span className="tabular block text-small text-ink-subtle">
                          {customer.phone ?? ''}
                        </span>
                      </TD>
                      <TD>
                        <EntityBadge status={customer.status} />
                      </TD>
                      <TD numeric className="text-ink-muted">
                        {customer.invoice_count}
                      </TD>
                      <TD numeric>
                        <Amount value={customer.total_sales} strong />
                      </TD>
                      <TD numeric>
                        <Amount
                          value={customer.total_pending}
                          className={Number(customer.total_pending) > 0 ? 'text-partial-fg' : ''}
                        />
                      </TD>
                      <TD>
                        <RowActions>
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <Eye />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(customer);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/new?customer=${customer.id}`}>
                              <FilePlus2 />
                              New invoice
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {customer.status === 'active' ? (
                            <DropdownMenuItem onSelect={() => void deactivate(customer)}>
                              Mark inactive
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem destructive onSelect={() => setDeleting(customer)}>
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
              icon={Users}
              title="No customers match that"
              description="Try a different spelling, or clear the filters to see everyone."
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
              icon={Users}
              title="No customers yet"
              description="Add your first customer to start creating invoices."
              action={
                <Button variant="primary" onClick={openCreate}>
                  <Plus />
                  Create customer
                </Button>
              }
            />
          )
        ) : null}
      </Card>

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'customer'}?`}
        description={
          (deleting?.invoice_count ?? 0) > 0 ? (
            <>
              This customer has {deleting?.invoice_count} invoice
              {deleting?.invoice_count === 1 ? '' : 's'} on record. Deleting them would break those
              invoices, so we will not allow it — mark them inactive instead.
            </>
          ) : (
            'This cannot be undone. The customer has no invoices, so nothing else will be affected.'
          )
        }
        confirmLabel="Delete customer"
        destructive
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
