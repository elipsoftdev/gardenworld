import type { MetadataRoute } from 'next';

const siteUrl = 'https://gardenworld.online';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/productos/'].map((path) => ({
    url: new URL(path, siteUrl).toString(),
  }));
}
