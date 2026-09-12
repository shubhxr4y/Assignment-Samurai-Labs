import { NextRequest } from 'next/server';
import { listItems, createItem } from '@/lib/server/services/item.service';
import { createItemSchema } from '@/lib/server/validators/item.validator';
import { listQuery } from '@/lib/server/validators/common';
import { ok, created, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = listQuery.parse(searchParams);
    const { rows, total } = await listItems(query);
    return ok(rows, { total });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createItemSchema.parse(body);
    const item = await createItem(input);
    return created(item);
  } catch (err) {
    return handleError(err);
  }
}
