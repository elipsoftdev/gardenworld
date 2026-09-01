import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isDevelopment = process.env.SITE_ENV === 'development';

  if (isDevelopment) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://gardenworld.online/sitemap.xml',
  };
}
