import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

function resetSecret(): string {
  const value = process.env.PASSWORD_RESET_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error('PASSWORD_RESET_SECRET must contain at least 32 characters');
  }
  return value;
}

export function generateResetCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function hashResetCode(email: string, code: string): string {
  return createHmac('sha256', resetSecret())
    .update(email.trim().toLowerCase() + ':' + code)
    .digest('hex');
}

export function resetCodeMatches(email: string, code: string, expectedHex: string): boolean {
  const actual = Buffer.from(hashResetCode(email, code), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
