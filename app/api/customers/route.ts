import { NextRequest } from 'next/server';
import { listCustomers, createCustomer } from '@/lib/server/services/customer.service';
import { createCustomerSchema } from '@/lib/server/validators/customer.validator';
import { listQuery } from '@/lib/server/validators/common';
import { ok, created, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = listQuery.parse(searchParams);
    const { rows, total } = await listCustomers(query);
    return ok(rows, { total });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createCustomerSchema.parse(body);
    const customer = await createCustomer(input);
    return created(customer);
  } catch (err) {
    return handleError(err);
  }
}
