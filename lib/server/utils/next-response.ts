import { NextResponse } from 'next/server';
import { ApiError } from './api-error';
import { ZodError } from 'zod';

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    meta ? { success: true, data, meta } : { success: true, data },
    { status }
  );
}

export function created<T>(data: T) {
  return ok(data, undefined, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: err.code, message: err.message, fields: err.fields },
      },
      { status: err.status }
    );
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (path && !fields[path]) fields[path] = issue.message;
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.issues[0]?.message ?? 'Invalid input data.',
          fields,
        },
      },
      { status: 400 }
    );
  }

  console.error('[API Error]', err);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    },
    { status: 500 }
  );
}
