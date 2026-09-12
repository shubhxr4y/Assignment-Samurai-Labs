import { NextRequest } from 'next/server';
import { listInvoices, createInvoice } from '@/lib/server/services/invoice.service';
import { createInvoiceSchema, invoiceListQuery } from '@/lib/server/validators/invoice.validator';
import { ok, created, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = invoiceListQuery.parse(searchParams);
    const { rows, total } = await listInvoices(query);
    return ok(rows, { total });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createInvoiceSchema.parse(body);
    const invoice = await createInvoice(input);
    return created(invoice);
  } catch (err) {
    return handleError(err);
  }
}
