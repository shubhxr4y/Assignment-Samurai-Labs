'use client';

import useSWR, { mutate as globalMutate, type SWRConfiguration } from 'swr';
import { fetcher } from '@/lib/api';
import { customerListKey, type CustomerListParams } from '@/services/customers';
import { itemListKey, type ItemListParams } from '@/services/items';
import { invoiceListKey, type InvoiceListParams } from '@/services/invoices';
import type {
  Customer,
  CustomerSalesRow,
  Dashboard,
  Invoice,
  InvoiceSummary,
  Item,
  ItemSalesHistoryRow,
  ItemSalesRow,
  PendingPaymentRow,
} from '@/types/api';

const options: SWRConfiguration = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false,
};

export function useCustomers(params: CustomerListParams = {}) {
  return useSWR<Customer[]>(customerListKey(params), fetcher, options);
}

export function useCustomer(id: string | null) {
  return useSWR<Customer>(id ? `/customers/${id}` : null, fetcher, options);
}

export function useItems(params: ItemListParams = {}) {
  return useSWR<Item[]>(itemListKey(params), fetcher, options);
}

export function useItem(id: string | null) {
  return useSWR<Item>(id ? `/items/${id}` : null, fetcher, options);
}

export function useItemInvoices(id: string | null) {
  return useSWR<ItemSalesHistoryRow[]>(id ? `/items/${id}/invoices` : null, fetcher, options);
}

export function useInvoices(params: InvoiceListParams = {}) {
  return useSWR<InvoiceSummary[]>(invoiceListKey(params), fetcher, options);
}

export function useInvoice(id: string | null) {
  return useSWR<Invoice>(id ? `/invoices/${id}` : null, fetcher, options);
}

export function useDashboard() {
  return useSWR<Dashboard>('/dashboard', fetcher, options);
}

export function useCustomerSales() {
  return useSWR<CustomerSalesRow[]>('/reports/customer-sales', fetcher, options);
}

export function useItemSales() {
  return useSWR<ItemSalesRow[]>('/reports/item-sales', fetcher, options);
}

export function usePendingPayments() {
  return useSWR<PendingPaymentRow[]>('/reports/pending-payments', fetcher, options);
}

export function useNextInvoiceNumber(date?: string, enabled = true) {
  return useSWR<{ invoice_number: string }>(
    enabled ? `/invoices/next-number${date ? `?date=${date}` : ''}` : null,
    fetcher,
    { ...options, revalidateOnMount: true, keepPreviousData: false },
  );
}

/**
 * Anything that changes an invoice changes the dashboard and the reports too,
 * so revalidate by prefix rather than making each screen remember what else
 * it affects.
 */
export function revalidate(...prefixes: string[]): void {
  void globalMutate(
    (key) => typeof key === 'string' && prefixes.some((prefix) => key.startsWith(prefix)),
    undefined,
    { revalidate: true },
  );
}

export const revalidateEverything = () =>
  revalidate('/customers', '/items', '/invoices', '/dashboard', '/reports');
