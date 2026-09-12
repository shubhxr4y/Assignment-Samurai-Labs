import { api, buildQuery } from '@/lib/api';
import type { Item, ItemInput } from '@/types/api';

export interface ItemListParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sort?: string;
  order?: 'asc' | 'desc';
}

export const itemListKey = (params: ItemListParams = {}) => `/items${buildQuery({ ...params })}`;

export const createItem = (input: ItemInput) => api.post<Item>('/items', input);
export const updateItem = (id: string, input: Partial<ItemInput>) =>
  api.put<Item>(`/items/${id}`, input);
export const deleteItem = (id: string) => api.delete(`/items/${id}`);
