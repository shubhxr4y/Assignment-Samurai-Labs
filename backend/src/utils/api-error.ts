/**
 * Every error the API returns on purpose is an ApiError. The message is
 * written for a small-business owner, not for a developer: it is shown in the
 * UI as-is.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message: string, fields?: Record<string, string>) {
    return new ApiError(400, 'BAD_REQUEST', message, fields);
  }

  static validation(message: string, fields?: Record<string, string>) {
    return new ApiError(422, 'VALIDATION_ERROR', message, fields);
  }

  static notFound(message = 'We could not find what you were looking for.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new ApiError(409, code, message);
  }

  static internal(message = 'Something went wrong on our side. Please try again.') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
