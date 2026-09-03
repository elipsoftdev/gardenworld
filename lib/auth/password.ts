import {
  randomBytes,
  scrypt,
  scryptSync,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSWORD_LENGTH = 10;

function encode(salt: Buffer, derived: Buffer): string {
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

/** Encoded as scrypt$N$r$p$saltBase64$hashBase64 so parameters can evolve. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, PARAMS);
  return encode(salt, derived);
}

/** Sync variant, used by the startup bootstrap which runs inside getDb(). */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH, PARAMS);
  return encode(salt, derived);
}

type DecodedHash = { N: number; r: number; p: number; salt: Buffer; expected: Buffer };

function decode(encoded: string): DecodedHash | null {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;

  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (salt.length === 0 || expected.length === 0) return null;

  return { N, r, p, salt, expected };
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const decoded = decode(encoded);
  if (!decoded) return false;

  let derived: Buffer;
  try {
    derived = await scryptAsync(password, decoded.salt, decoded.expected.length, {
      N: decoded.N,
      r: decoded.r,
      p: decoded.p,
      maxmem: PARAMS.maxmem,
    });
  } catch {
    return false;
  }

  return derived.length === decoded.expected.length && timingSafeEqual(derived, decoded.expected);
}

export type PasswordProblem = 'too_short' | 'too_long' | 'too_simple';

/** Minimum policy: length plus a mix of letters and non-letters. */
export function validatePasswordStrength(password: unknown): PasswordProblem | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return 'too_short';
  if (password.length > 200) return 'too_long';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasOther = /[^a-zA-Z]/.test(password);
  if (!hasLetter || !hasOther) return 'too_simple';
  return null;
}

export function passwordProblemMessage(problem: PasswordProblem): string {
  switch (problem) {
    case 'too_short':
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    case 'too_long':
      return 'Password must be at most 200 characters';
    case 'too_simple':
      return 'Password must mix letters with digits or symbols';
  }
}
