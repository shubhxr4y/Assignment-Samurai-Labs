import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from '../utils/api-error.js';

type Source = 'body' | 'query' | 'params';

/** Turn Zod's issue list into { fieldName: "Human sentence." }. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Validates and *replaces* the request segment with the parsed value, so
 * controllers receive coerced, trimmed, fully typed input.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields = fieldErrors(result.error);
      const first = Object.values(fields)[0] ?? 'Please check the details you entered.';
      next(ApiError.validation(first, fields));
      return;
    }
    Object.defineProperty(req, source, { value: result.data, writable: true });
    next();
  };
