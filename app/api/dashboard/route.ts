import { NextRequest } from 'next/server';
import { getDashboard } from '@/lib/server/services/report.service';
import { ok, handleError } from '@/lib/server/utils/next-response';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const data = await getDashboard();
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
