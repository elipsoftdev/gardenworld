export const WHATSAPP_NUMBER = '584224273369';
export const PRODUCTION_URL = 'https://gardenworld.online';

export function isDevelopmentSite(): boolean {
  return process.env.SITE_ENV === 'development';
}

export function getSiteUrl(): string {
  return process.env.SITE_URL?.trim() || (isDevelopmentSite() ? 'https://dev.gardenworld.online' : PRODUCTION_URL);
}

export function getCanonical(pathname: string): string | undefined {
  if (isDevelopmentSite()) return undefined;
  return new URL(pathname, PRODUCTION_URL).toString();
}

export function getRobots(indexable = true): { index: boolean; follow: boolean } {
  const allow = indexable && !isDevelopmentSite();
  return { index: allow, follow: allow };
}

export function makeWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, getSiteUrl()).toString();
}
