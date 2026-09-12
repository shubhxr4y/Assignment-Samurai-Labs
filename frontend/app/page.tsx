'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { StatTile } from '@/components/app/stat-tile';
import { SalesChart } from '@/components/app/sales-chart';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PaymentBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useDashboard } from '@/hooks/use-api';
import { formatAge, formatDate, formatQuantity } from '@/lib/format';

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useDashboard();

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        </Card>
      </>
    );
  }

  const summary = data?.summary;
  const hasInvoices = (summary?.invoice_count ?? 0) > 0;
  const topCustomers = data?.topCustomers ?? [];
  const topCustomerPeak = Number(topCustomers[0]?.total_sales ?? 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How much you have sold, how much has come in, and who still owes you."
        action={
          <Button asChild variant="primary">
            <Link href="/invoices/new">
              <Plus />
              Create invoice
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total sales"
          value={summary?.total_sales}
          loading={isLoading}
          className="animate-fade-in-up animate-delay-50"
          hint={
            summary ? `Across ${summary.invoice_count} invoice${summary.invoice_count === 1 ? '' : 's'}` : undefined
          }
        />
        <StatTile
          label="Received"
          value={summary?.total_collected}
          tone="positive"
          loading={isLoading}
          className="animate-fade-in-up animate-delay-100"
          hint={summary ? `${summary.paid_count} invoices settled in full` : undefined}
        />
        <StatTile
          label="Outstanding"
          value={summary?.total_outstanding}
          tone="attention"
          loading={isLoading}
          href="/reports?view=pending"
          className="animate-fade-in-up animate-delay-150"
          hint={
            summary
              ? `${summary.pending_count + summary.partially_paid_count} invoices awaiting payment`
              : undefined
          }
        />
        <StatTile
          label="Customers"
          value={summary?.customer_count}
          format="count"
          loading={isLoading}
          href="/customers"
          className="animate-fade-in-up animate-delay-200"
          hint={summary ? `${summary.item_count} items in your catalogue` : undefined}
        />
      </div>

      {!isLoading && !hasInvoices ? (
        <Card className="mt-5 animate-fade-in-up">
          <EmptyState
            icon={FileText}
            title="Your books are empty"
            description="Add a customer and a few items, then raise your first invoice. Your sales and outstanding payments will show up here."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="primary">
                  <Link href="/customers">
                    <Users />
                    Add a customer
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/invoices/new">Create an invoice</Link>
                </Button>
              </div>
            }
          />
        </Card>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-fade-in-up animate-delay-200">
          <CardHeader
            title="Sales over the last six months"
            description="Invoiced value, with the part you have actually received filled in."
          />
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <SalesChart data={data?.monthlySales ?? []} />
            )}
          </CardBody>
        </Card>

        <Card className="animate-fade-in-up animate-delay-300">
          <CardHeader
            title="Who owes you"
            description="Largest amounts still pending."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/reports?view=pending">
                  All
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
          {isLoading ? (
            <CardBody className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-9" />
              ))}
            </CardBody>
          ) : (data?.pendingPayments.length ?? 0) === 0 ? (
            <EmptyState
              title="Nothing outstanding"
              description="Every invoice you have raised has been paid in full."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-line">
              {data?.pendingPayments.map((row) => (
                <li key={row.invoice_id}>
                  <Link
                    href={`/invoices/${row.invoice_id}`}
                    className="group flex items-center justify-between gap-3 px-5 py-3 transition-all duration-150 hover:bg-brand-50/40 hover:pl-6"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink transition-colors group-hover:text-brand-700">{row.customer_name}</span>
                      <span className="block truncate text-small text-ink-subtle">
                        {row.invoice_number} · {formatAge(row.days_outstanding)} old
                      </span>
                    </span>
                    <Amount value={row.amount_pending} strong className="text-partial-fg transition-transform group-hover:scale-105" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2 animate-fade-in-up animate-delay-300">
          <CardHeader
            title="Recent invoices"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/invoices">
                  All invoices
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
          {isLoading ? (
            <CardBody className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </CardBody>
          ) : (data?.recentInvoices.length ?? 0) === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Create your first invoice and it will appear here."
              className="py-10"
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Invoice</TH>
                    <TH>Customer</TH>
                    <TH>Date</TH>
                    <TH numeric>Total</TH>
                    <TH numeric>Pending</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data?.recentInvoices.map((invoice) => (
                    <TR key={invoice.id} interactive>
                      <TD className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="hover:text-brand-600 transition-colors">
                          {invoice.invoice_number}
                        </Link>
                      </TD>
                      <TD className="max-w-48 truncate text-ink-muted">{invoice.customer_name}</TD>
                      <TD className="whitespace-nowrap text-ink-muted">
                        {formatDate(invoice.invoice_date)}
                      </TD>
                      <TD numeric>
                        <Amount value={invoice.total_amount} />
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
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card className="animate-fade-in-up animate-delay-400">
          <CardHeader title="Top customers" description="By value invoiced." />
          {isLoading ? (
            <CardBody className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </CardBody>
          ) : topCustomers.length === 0 ? (
            <EmptyState
              title="No sales yet"
              description="Customer totals appear once you raise an invoice."
              className="py-10"
            />
          ) : (
            <CardBody className="space-y-3.5">
              {topCustomers.map((row) => {
                const width =
                  topCustomerPeak > 0 ? (Number(row.total_sales) / topCustomerPeak) * 100 : 0;
                return (
                  <div key={row.customer_id} className="group">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/customers/${row.customer_id}`}
                        className="truncate text-body font-medium text-ink hover:text-brand-600 transition-colors"
                      >
                        {row.customer_name}
                      </Link>
                      <Amount value={row.total_sales} className="text-small font-medium" />
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-700 ease-out group-hover:bg-brand-600"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardBody>
          )}
        </Card>

        <Card className="lg:col-span-3 animate-fade-in-up animate-delay-400">
          <CardHeader
            title="Best-selling items"
            description="What is actually moving, by value."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/reports?view=items">
                  Full report
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
          {isLoading ? (
            <CardBody className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </CardBody>
          ) : (data?.topItems.length ?? 0) === 0 ? (
            <EmptyState
              title="No items sold yet"
              description="Once you invoice an item, its sales show up here."
              className="py-10"
            />
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
                <TBody>
                  {data?.topItems.map((row) => (
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
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}
