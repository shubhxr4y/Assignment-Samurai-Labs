import { NextRequest } from 'next/server';
import { getItem, updateItem, deleteItem } from '@/lib/server/services/item.service';
import { updateItemSchema } from '@/lib/server/validators/item.validator';
import { ok, noContent, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const item = await getItem(id);
    return ok(item);
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
    const input = updateItemSchema.parse(body);
    const item = await updateItem(id, input);
    return ok(item);
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
    await deleteItem(id);
    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
