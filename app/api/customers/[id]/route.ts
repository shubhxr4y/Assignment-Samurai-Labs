import { NextRequest } from 'next/server';
import { getCustomer, updateCustomer, deleteCustomer } from '@/lib/server/services/customer.service';
import { updateCustomerSchema } from '@/lib/server/validators/customer.validator';
import { ok, noContent, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const customer = await getCustomer(id);
    return ok(customer);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const input = updateCustomerSchema.parse(body);
    const customer = await updateCustomer(id, input);
    return ok(customer);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteCustomer(id);
    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
