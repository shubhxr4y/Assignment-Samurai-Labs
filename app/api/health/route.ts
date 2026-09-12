import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      name: 'Bahi API',
      status: 'ok',
      time: new Date().toISOString(),
    },
  });
}
