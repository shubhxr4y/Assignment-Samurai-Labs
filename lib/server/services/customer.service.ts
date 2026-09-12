import * as repo from '../repositories/customer.repository';
import { ApiError } from '../utils/api-error';
import type { ListQuery } from '../validators/common';
import type { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';

export const listCustomers = (params: ListQuery) => repo.list(params);

export async function getCustomer(id: string) {
  const customer = await repo.findById(id);
  if (!customer) throw ApiError.notFound('We could not find that customer.');
  return customer;
}

export async function createCustomer(input: CreateCustomerInput) {
  const customer = await repo.create(input);
  if (!customer) throw ApiError.internal('The customer could not be saved. Please try again.');
  return customer;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomer(id);
  const customer = await repo.update(id, input);
  if (!customer) throw ApiError.notFound('We could not find that customer.');
  return customer;
}

/**
 * Customers with invoice history are never hard-deleted: an invoice without a
 * customer is not a record anyone can use at tax time. The UI offers "Mark
 * inactive" instead, which hides them from new invoices but keeps history.
 */
export async function deleteCustomer(id: string) {
  await getCustomer(id);
  const invoiceCount = await repo.countInvoices(id);
  if (invoiceCount > 0) {
    throw ApiError.conflict(
      `This customer has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} on record, so they cannot be deleted. Mark them inactive instead — their invoices stay untouched.`,
      'CUSTOMER_IN_USE',
    );
  }
  const deleted = await repo.remove(id);
  if (!deleted) throw ApiError.notFound('We could not find that customer.');
}
