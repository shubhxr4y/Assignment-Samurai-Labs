import { NextRequest } from 'next/server';
import { recordPayment } from '@/lib/server/services/invoice.service';
import { recordPaymentSchema } from '@/lib/server/validators/invoice.validator';
import { ok, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const input = recordPaymentSchema.parse(body);
    const invoice = await recordPayment(id, input);
    return ok(invoice);
  } catch (err) {
    return handleError(err);
  }
}
