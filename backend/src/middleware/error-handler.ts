import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';

interface PgError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

/**
 * Translates database errors into the same friendly language the rest of the
 * API uses. The user should never see "23505" or a constraint name.
 */
function fromDatabaseError(error: PgError): ApiError | null {
  switch (error.code) {
    case '23505': // unique_violation
      if (error.constraint === 'invoices_invoice_number_key') {
        return ApiError.conflict(
          'That invoice number is already in use. Try the next one in your series.',
          'DUPLICATE_INVOICE_NUMBER',
        );
      }
      return ApiError.conflict('This record already exists.');
    case '23503': // foreign_key_violation
      if (error.constraint?.startsWith('invoices_customer_id')) {
        return ApiError.conflict(
          'This customer has invoices, so they cannot be deleted. Mark them inactive instead.',
          'CUSTOMER_IN_USE',
        );
      }
      if (error.constraint?.startsWith('invoice_items_item_id')) {
        return ApiError.conflict(
          'This item appears on one or more invoices, so it cannot be deleted. Mark it inactive instead.',
          'ITEM_IN_USE',
        );
      }
      return ApiError.conflict('This record is linked to other records and cannot be removed.');
    case '23514': // check_violation
      if (error.constraint === 'invoices_paid_not_over_total') {
        return ApiError.validation('The amount received cannot be more than the invoice total.');
      }
      return ApiError.validation('Some of the values entered are not allowed.');
    case '22P02': // invalid_text_representation (bad uuid etc.)
      return ApiError.badRequest('That link looks wrong. Please go back and try again.');
    case '22003': // numeric_value_out_of_range
      return ApiError.validation('That amount is too large to record.');
    default:
      return null;
  }
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let apiError: ApiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else {
    const translated = fromDatabaseError(error as PgError);
    apiError = translated ?? ApiError.internal();
    if (!translated) console.error('[unhandled]', error);
  }

  res.status(apiError.status).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.fields ? { fields: apiError.fields } : {}),
      ...(env.isProduction || apiError.status < 500
        ? {}
        : { debug: (error as Error)?.message }),
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `No API route matches ${req.method} ${req.path}.` },
  });
}
