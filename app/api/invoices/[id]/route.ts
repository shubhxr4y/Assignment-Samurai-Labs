import { NextRequest } from 'next/server';
import { getInvoice, updateInvoice, deleteInvoice } from '@/lib/server/services/invoice.service';
import { updateInvoiceSchema } from '@/lib/server/validators/invoice.validator';
import { ok, noContent, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoice = await getInvoice(id);
    return ok(invoice);
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
    const input = updateInvoiceSchema.parse(body);
    const invoice = await updateInvoice(id, input);
    return ok(invoice);
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
    await deleteInvoice(id);
    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
