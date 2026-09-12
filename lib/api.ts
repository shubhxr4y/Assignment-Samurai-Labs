import type { ApiFailure, ApiSuccess } from '@/types/api';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL = (!rawApiUrl || rawApiUrl.includes('localhost:4000') ? '/api' : rawApiUrl).replace(/\/$/, '');

/**
 * The error the UI actually shows. `message` is already written for a
 * business owner by the API; `fields` maps onto form inputs.
 */
export class RequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const NETWORK_MESSAGE =
  'We could not reach the server. Check that the API is running, then try again.';

async function request<T>(path: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  let response: Response;
  const url = path.startsWith('http')
    ? path
    : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new RequestError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }

  if (response.status === 204) {
    return { success: true, data: undefined as T };
  }

  let payload: ApiSuccess<T> | ApiFailure;
  try {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new RequestError(response.status, 'BAD_RESPONSE', NETWORK_MESSAGE);
  }

  if (!response.ok || payload.success === false) {
    const error = (payload as ApiFailure).error;
    throw new RequestError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.fields,
    );
  }

  return payload;
}

export const api = {
  get: <T>(path: string) => request<T>(path).then((r) => r),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }).then((r) => r.data),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }).then(() => undefined),
};

/** SWR fetcher: returns just the payload body. */
export const fetcher = <T>(path: string): Promise<T> => request<T>(path).then((r) => r.data);

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
