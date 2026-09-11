import * as repo from '../repositories/item.repository.js';
import { ApiError } from '../utils/api-error.js';
import type { ListQuery } from '../validators/common.js';
import type { CreateItemInput, UpdateItemInput } from '../validators/item.validator.js';

export const listItems = (params: ListQuery) => repo.list(params);

export async function getItem(id: string) {
  const item = await repo.findById(id);
  if (!item) throw ApiError.notFound('We could not find that item.');
  return item;
}

/**
 * Sales history for one item. Returns 404 through getItem for an unknown id,
 * so the detail screen fails the same way the rest of the API does.
 */
export async function getItemSalesHistory(id: string) {
  await getItem(id);
  return repo.salesHistory(id);
}

export async function createItem(input: CreateItemInput) {
  const item = await repo.create(input);
  if (!item) throw ApiError.internal('The item could not be saved. Please try again.');
  return item;
}

/**
 * Editing an item changes it for *future* invoices only. Past invoices keep
 * the name, price and tax rate captured when they were raised.
 */
export async function updateItem(id: string, input: UpdateItemInput) {
  await getItem(id);
  const item = await repo.update(id, input);
  if (!item) throw ApiError.notFound('We could not find that item.');
  return item;
}

export async function deleteItem(id: string) {
  await getItem(id);
  const usage = await repo.countInvoiceLines(id);
  if (usage > 0) {
    throw ApiError.conflict(
      `This item appears on ${usage} invoice line${usage === 1 ? '' : 's'}, so it cannot be deleted. Mark it inactive instead — it will stop showing up on new invoices.`,
      'ITEM_IN_USE',
    );
  }
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('We could not find that item.');
}
