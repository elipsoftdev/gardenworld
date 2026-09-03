export type ApiErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'internal_error';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  validation_error: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  unsupported_media_type: 415,
  internal_error: 500,
};

export function ok(data: unknown, status = 200, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, { ...init, status });
}

export function created(data: unknown, init?: ResponseInit): Response {
  return ok(data, 201, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  extra?: { status?: number; details?: unknown; headers?: HeadersInit },
): Response {
  const body: { ok: false; error: Record<string, unknown> } = {
    ok: false,
    error: { code, message },
  };
  if (extra?.details !== undefined) body.error.details = extra.details;
  return Response.json(body, {
    status: extra?.status ?? STATUS_BY_CODE[code],
    headers: extra?.headers,
  });
}

/** Thrown by helpers to short-circuit a handler with a specific API error. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): Response {
    return fail(this.code, this.message, { details: this.details, status: this.status });
  }
}

/**
 * Wraps a route handler so unexpected failures become a generic 500 instead of
 * leaking stack traces or SQL text to the client.
 */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) return error.toResponse();
      console.error('[api] unhandled error', error instanceof Error ? error.message : error);
      return fail('internal_error', 'Unexpected server error');
    }
  };
}
