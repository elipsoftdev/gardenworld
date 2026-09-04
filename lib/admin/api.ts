export type ApiFailure = {
  code?: string;
  message?: string;
  details?: Record<string, string>;
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud no pudo procesarse.',
  401: 'Tu sesión terminó. Ingresa nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No encontramos el recurso solicitado.',
  409: 'La acción entra en conflicto con información existente.',
  413: 'El archivo supera el tamaño permitido.',
  415: 'Formato de archivo no permitido.',
  422: 'Revisa los campos marcados e intenta nuevamente.',
  429: 'Demasiados intentos. Intenta nuevamente más tarde.',
  500: 'Ocurrió un error inesperado. Intenta nuevamente.',
};

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  let payload: { ok?: boolean; data?: T; error?: ApiFailure } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    // The status-based fallback below remains safe and useful.
  }

  if (!response.ok || payload.ok === false) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('gardenworld:unauthorized'));
    }
    throw new AdminApiError(
      response.status,
      payload.error?.code ?? 'request_failed',
      STATUS_MESSAGES[response.status] ?? payload.error?.message ?? 'No se pudo completar la acción.',
      payload.error?.details,
    );
  }

  return payload.data as T;
}

export function messageForError(error: unknown, fallback = 'No se pudo completar la acción.'): string {
  return error instanceof AdminApiError ? error.message : fallback;
}

export function slugFromName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatMoney(value: number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Precio por definir';
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin registro';
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value.endsWith('Z') ? value : `${value}Z`),
  );
}
