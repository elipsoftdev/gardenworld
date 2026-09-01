import type { MetadataRoute } from 'next';

const isDevelopment = process.env.SITE_ENV === 'development';
const siteUrl = process.env.SITE_URL || 'https://gardenworld.online';

export default function sitemap(): MetadataRoute.Sitemap {
  if (isDevelopment) {
    return [];
  }

  return ['/', '/productos/'].map((path) => ({
    url: new URL(path, siteUrl).toString(),
  }));
}
