import { NextRequest } from 'next/server';
import { getItemSalesHistory } from '@/lib/server/services/item.service';
import { ok, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const history = await getItemSalesHistory(id);
    return ok(history);
  } catch (err) {
    return handleError(err);
  }
}
