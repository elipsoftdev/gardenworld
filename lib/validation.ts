import { ApiError } from '@/lib/http/response';
import { isValidSlug } from '@/lib/slug';

export type FieldErrors = Record<string, string>;

const MAX_JSON_BODY_BYTES = 512 * 1024;

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('unsupported_media_type', 'Expected application/json body');
  }
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new ApiError('payload_too_large', 'Request body is too large');
  }
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new ApiError('bad_request', 'Malformed JSON body');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError('bad_request', 'Body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

type StringOptions = {
  required?: boolean;
  min?: number;
  max?: number;
  nullable?: boolean;
  pattern?: RegExp;
};

type NumberOptions = {
  required?: boolean;
  min?: number;
  max?: number;
  nullable?: boolean;
  integer?: boolean;
};

/** Collects field-level problems so a request reports all of them at once. */
export class Validator {
  readonly errors: FieldErrors = {};

  constructor(private readonly body: Record<string, unknown>) {}

  has(field: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.body, field);
  }

  raw(field: string): unknown {
    return this.body[field];
  }

  addError(field: string, message: string): void {
    this.errors[field] = message;
  }

  /**
   * Returns undefined when the field is absent or invalid, null when explicitly
   * cleared, so callers can tell "leave untouched" from "set to NULL".
   */
  string(field: string, options: StringOptions = {}): string | null | undefined {
    if (!this.has(field)) {
      if (options.required) this.addError(field, 'Required');
      return undefined;
    }
    const value = this.body[field];
    if (value === null) {
      if (options.required) this.addError(field, 'Required');
      return options.required ? undefined : null;
    }
    if (typeof value !== 'string') {
      this.addError(field, 'Must be a string');
      return undefined;
    }
    const text = value.trim();
    if (text.length === 0) {
      if (options.required) this.addError(field, 'Required');
      return options.required ? undefined : null;
    }
    if (options.min !== undefined && text.length < options.min) {
      this.addError(field, `Must be at least ${options.min} characters`);
      return undefined;
    }
    const max = options.max ?? 5000;
    if (text.length > max) {
      this.addError(field, `Must be at most ${max} characters`);
      return undefined;
    }
    if (options.pattern && !options.pattern.test(text)) {
      this.addError(field, 'Invalid format');
      return undefined;
    }
    return text;
  }

  slug(field: string, options: { required?: boolean } = {}): string | undefined {
    if (!this.has(field)) {
      if (options.required) this.addError(field, 'Required');
      return undefined;
    }
    const value = this.body[field];
    if (value === null || value === '') {
      if (options.required) this.addError(field, 'Required');
      return undefined;
    }
    if (typeof value !== 'string' || !isValidSlug(value.trim().toLowerCase())) {
      this.addError(field, 'Must be a lowercase slug (letters, digits, hyphens)');
      return undefined;
    }
    return value.trim().toLowerCase();
  }

  number(field: string, options: NumberOptions = {}): number | null | undefined {
    if (!this.has(field)) {
      if (options.required) this.addError(field, 'Required');
      return undefined;
    }
    const value = this.body[field];
    if (value === null || value === '') {
      if (options.nullable) return null;
      this.addError(field, options.required ? 'Required' : 'Must be a number');
      return undefined;
    }
    if (typeof value !== 'number' && typeof value !== 'string') {
      this.addError(field, 'Must be a number');
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      this.addError(field, 'Must be a number');
      return undefined;
    }
    if (options.integer && !Number.isInteger(parsed)) {
      this.addError(field, 'Must be an integer');
      return undefined;
    }
    if (options.min !== undefined && parsed < options.min) {
      this.addError(field, `Must be at least ${options.min}`);
      return undefined;
    }
    if (options.max !== undefined && parsed > options.max) {
      this.addError(field, `Must be at most ${options.max}`);
      return undefined;
    }
    return parsed;
  }

  boolean(field: string, options: { required?: boolean } = {}): 0 | 1 | undefined {
    if (!this.has(field)) {
      if (options.required) this.addError(field, 'Required');
      return undefined;
    }
    const value = this.body[field];
    if (value === true || value === 1 || value === 'true' || value === '1') return 1;
    if (value === false || value === 0 || value === 'false' || value === '0') return 0;
    this.addError(field, 'Must be a boolean');
    return undefined;
  }

  oneOf<T extends string>(
    field: string,
    allowed: readonly T[],
    options: { required?: boolean } = {},
  ): T | undefined {
    if (!this.has(field)) {
      if (options.required) this.addError(field, 'Required');
      return undefined;
    }
    const value = this.body[field];
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      this.addError(field, `Must be one of: ${allowed.join(', ')}`);
      return undefined;
    }
    return value as T;
  }

  email(field: string, options: { required?: boolean } = {}): string | undefined {
    const value = this.string(field, { required: options.required, max: 254 });
    if (typeof value !== 'string') return undefined;
    const normalized = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      this.addError(field, 'Invalid email address');
      return undefined;
    }
    return normalized;
  }

  idList(field: string, options: { max?: number } = {}): number[] | undefined {
    const value = this.body[field];
    if (!Array.isArray(value)) {
      this.addError(field, 'Must be an array of ids');
      return undefined;
    }
    const max = options.max ?? 500;
    if (value.length > max) {
      this.addError(field, `Must contain at most ${max} ids`);
      return undefined;
    }
    const ids: number[] = [];
    for (const item of value) {
      const parsed = typeof item === 'number' ? item : Number(item);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        this.addError(field, 'Must contain positive integer ids');
        return undefined;
      }
      ids.push(parsed);
    }
    if (new Set(ids).size !== ids.length) {
      this.addError(field, 'Must not contain duplicate ids');
      return undefined;
    }
    return ids;
  }

  get failed(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  assertValid(): void {
    if (this.failed) {
      throw new ApiError('validation_error', 'Invalid request payload', this.errors);
    }
  }
}

export function parseId(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError('not_found', 'Resource not found');
  }
  return parsed;
}

export const CURRENCIES = ['USD', 'VES', 'EUR'] as const;
export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export const STOCK_STATUSES = ['in_stock', 'out_of_stock', 'preorder', 'discontinued'] as const;
