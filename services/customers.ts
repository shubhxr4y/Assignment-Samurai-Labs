import { api, buildQuery } from '@/lib/api';
import type { Customer, CustomerInput } from '@/types/api';

export interface CustomerListParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sort?: string;
  order?: 'asc' | 'desc';
}

export const customerListKey = (params: CustomerListParams = {}) =>
  `/customers${buildQuery({ ...params })}`;

export const createCustomer = (input: CustomerInput) => api.post<Customer>('/customers', input);
export const updateCustomer = (id: string, input: Partial<CustomerInput>) =>
  api.put<Customer>(`/customers/${id}`, input);
export const deleteCustomer = (id: string) => api.delete(`/customers/${id}`);
