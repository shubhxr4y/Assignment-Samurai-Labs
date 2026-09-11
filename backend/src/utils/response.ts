import type { Response } from 'express';

/**
 * One response envelope for the whole API:
 *   success -> { success: true, data, meta? }
 *   failure -> { success: false, error: { code, message, fields? } }
 * The frontend has exactly one shape to unwrap.
 */
export interface ApiMeta {
  total?: number;
  [key: string]: unknown;
}

export function ok<T>(res: Response, data: T, meta?: ApiMeta, status = 200): Response {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, undefined, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
