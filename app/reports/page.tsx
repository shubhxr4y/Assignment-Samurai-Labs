'use client';

import * as React from 'react';
import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Amount } from '@/components/ui/amount';
import { Card, CardHeader } from '@/components/ui/card';
import { PaymentBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useCustomerSales, useItemSales, usePendingPayments } from '@/hooks/use-api';
import { formatAge, formatDate, formatQuantity } from '@/lib/format';

type View = 'customers' | 'items' | 'pending';

function ReportsTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const view = (params.get('view') as View | null) ?? 'customers';

  const customerSales = useCustomerSales();
  const itemSales = useItemSales();
  const pending = usePendingPayments();

  const setView = (next: string) => {
    router.replace(`/reports?view=${next}`, { scroll: false });
  };

  const totalOutstanding = (pending.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_pending),
    0,
  );

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList className="mb-5">
        <TabsTrigger value="customers">Customer-wise sales</TabsTrigger>
        <TabsTrigger value="items">Item-wise sales</TabsTrigger>
        <TabsTrigger value="pending">Pending payments</TabsTrigger>
      </TabsList>

      <TabsContent value="customers">
        <Card>
          <CardHeader
            title="Customer-wise sales"
            description="How much has been invoiced to each customer, and how much of it has come in."
          />
          {customerSales.error ? (
            <ErrorState
              message={customerSales.error.message}
              onRetry={() => void customerSales.mutate()}
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Customer</TH>
                    <TH numeric>Invoices</TH>
                    <TH numeric>Total sales</TH>
                    <TH numeric>Received</TH>
                    <TH numeric>Outstanding</TH>
                  </TR>
                </THead>
                {customerSales.isLoading ? (
                  <TableSkeleton columns={5} />
                ) : (
                  <TBody>
                    {customerSales.data?.map((row) => (
                      <TR key={row.customer_id} interactive>
                        <TD>
                          <Link
                            href={`/customers/${row.customer_id}`}
                            className="font-medium text-ink hover:text-brand-600"
                          >
                            {row.customer_name}
                          </Link>
                        </TD>
                        <TD numeric className="text-ink-muted">
                          {row.invoice_count}
                        </TD>
                        <TD numeric>
                          <Amount value={row.total_sales} strong />
                        </TD>
                        <TD numeric>
                          <Amount value={row.total_paid} />
                        </TD>
                        <TD numeric>
                          <Amount
                            value={row.total_pending}
                            className={Number(row.total_pending) > 0 ? 'text-partial-fg' : ''}
                          />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                )}
              </Table>
            </TableWrap>
          )}
          {!customerSales.isLoading && (customerSales.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No sales to report yet"
              description="Once you raise an invoice, customer totals will appear here."
            />
          ) : null}
        </Card>
      </TabsContent>

      <TabsContent value="items">
        <Card>
          <CardHeader
            title="Item-wise sales"
            description="What has sold, in what quantity, and what it brought in. Figures use the name and price each item was invoiced at."
          />
          {itemSales.error ? (
            <ErrorState message={itemSales.error.message} onRetry={() => void itemSales.mutate()} />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Item</TH>
                    <TH numeric>Quantity sold</TH>
                    <TH numeric>Invoices</TH>
                    <TH numeric>Sales value</TH>
                  </TR>
                </THead>
                {itemSales.isLoading ? (
                  <TableSkeleton columns={4} />
                ) : (
                  <TBody>
                    {itemSales.data?.map((row) => (
                      <TR key={row.item_id ?? row.item_name}>
                        <TD className="font-medium">{row.item_name}</TD>
                        <TD numeric className="text-ink-muted">
                          {formatQuantity(row.quantity_sold)} {row.unit}
                        </TD>
                        <TD numeric className="text-ink-muted">
                          {row.invoice_count}
                        </TD>
                        <TD numeric>
                          <Amount value={row.total_sales} strong />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                )}
              </Table>
            </TableWrap>
          )}
          {!itemSales.isLoading && (itemSales.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Nothing sold yet"
              description="Add items to an invoice and their sales will show up here."
            />
          ) : null}
        </Card>
      </TabsContent>

      <TabsContent value="pending">
        <Card>
          <CardHeader
            title="Pending payments"
            description="Every invoice with money still to come in, largest first."
            action={
              pending.data && pending.data.length > 0 ? (
                <div className="text-right">
                  <p className="text-label uppercase text-ink-subtle">Total outstanding</p>
                  <p className="tabular text-lead font-semibold text-partial-fg">
                    <Amount value={totalOutstanding} muteZero={false} />
                  </p>
                </div>
              ) : undefined
            }
          />
          {pending.error ? (
            <ErrorState message={pending.error.message} onRetry={() => void pending.mutate()} />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Customer</TH>
                    <TH>Invoice</TH>
                    <TH>Date</TH>
                    <TH numeric>Age</TH>
                    <TH numeric>Invoice total</TH>
                    <TH numeric>Received</TH>
                    <TH numeric>Pending</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                {pending.isLoading ? (
                  <TableSkeleton columns={8} />
                ) : (
                  <TBody>
                    {pending.data?.map((row) => (
                      <TR key={row.invoice_id} interactive>
                        <TD>
                          <Link
                            href={`/customers/${row.customer_id}`}
                            className="font-medium text-ink hover:text-brand-600"
                          >
                            {row.customer_name}
                          </Link>
                        </TD>
                        <TD>
                          <Link
                            href={`/invoices/${row.invoice_id}`}
                            className="tabular text-ink-muted hover:text-brand-600"
                          >
                            {row.invoice_number}
                          </Link>
                        </TD>
                        <TD className="whitespace-nowrap text-ink-muted">
                          {formatDate(row.invoice_date)}
                        </TD>
                        <TD numeric className="whitespace-nowrap text-ink-muted">
                          {formatAge(row.days_outstanding)}
                        </TD>
                        <TD numeric>
                          <Amount value={row.total_amount} />
                        </TD>
                        <TD numeric>
                          <Amount value={row.amount_paid} />
                        </TD>
                        <TD numeric>
                          <Amount value={row.amount_pending} strong className="text-partial-fg" />
                        </TD>
                        <TD>
                          <PaymentBadge status={row.payment_status} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                )}
              </Table>
            </TableWrap>
          )}
          {!pending.isLoading && (pending.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Nothing outstanding"
              description="Every invoice you have raised has been paid in full. Good place to be."
            />
          ) : null}
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Where the money came from, what sold, and what is still owed."
      />
      <Suspense fallback={null}>
        <ReportsTabs />
      </Suspense>
    </>
  );
}
