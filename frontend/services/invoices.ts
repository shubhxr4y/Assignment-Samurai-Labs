import { api, buildQuery } from '@/lib/api';
import type { Invoice, InvoiceInput, PaymentStatus } from '@/types/api';

export interface InvoiceListParams {
  search?: string;
  status?: PaymentStatus | 'all';
  customer_id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const invoiceListKey = (params: InvoiceListParams = {}) =>
  `/invoices${buildQuery({ ...params })}`;

export const createInvoice = (input: InvoiceInput) => api.post<Invoice>('/invoices', input);
export const updateInvoice = (id: string, input: InvoiceInput) =>
  api.put<Invoice>(`/invoices/${id}`, input);
export const deleteInvoice = (id: string) => api.delete(`/invoices/${id}`);

export const recordPayment = (
  id: string,
  input: { amount_paid?: string; mark_as?: 'paid' | 'pending' },
) => api.patch<Invoice>(`/invoices/${id}/payment`, input);
