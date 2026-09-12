import { NextRequest } from 'next/server';
import { suggestInvoiceNumber } from '@/lib/server/services/invoice.service';
import { ok, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') ?? undefined;
    const result = await suggestInvoiceNumber(date);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
