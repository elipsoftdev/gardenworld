import { ApiError } from './response';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();
  const headerHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (headerHost) hosts.add(headerHost.toLowerCase());
  try {
    hosts.add(new URL(request.url).host.toLowerCase());
  } catch {
    // Malformed request URL: the header host is enough.
  }
  const siteHost = hostOf(process.env.SITE_URL ?? null);
  if (siteHost) hosts.add(siteHost);
  return hosts;
}

/**
 * Same-origin check for state-changing requests. Browsers always send Origin on
 * cross-site mutations, so a mismatch is rejected; non-browser clients that send
 * no Origin at all are allowed through (they cannot carry ambient cookies).
 */
export function assertSameOrigin(request: Request): void {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') {
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') {
      throw new ApiError('forbidden', 'Cross-site request rejected');
    }
    return;
  }

  const originHost = hostOf(origin);
  if (!originHost || !allowedHosts(request).has(originHost)) {
    throw new ApiError('forbidden', 'Cross-site request rejected');
  }
}

export function isSecureRequest(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
