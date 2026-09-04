import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';
import { getPublicCatalog } from '@/lib/public/catalog';
import { isDevelopmentSite, PRODUCTION_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  if (isDevelopmentSite()) return [];
  const db = getDb();
  const { products, categories } = getPublicCatalog(db);
  const base = [
    { url: `${PRODUCTION_URL}/` },
    { url: `${PRODUCTION_URL}/productos/` },
    { url: `${PRODUCTION_URL}/nosotros/` },
  ];
  const categoryUrls = categories.map((category) => ({ url: `${PRODUCTION_URL}/productos/categoria/${category.slug}/`, lastModified: new Date(`${category.updatedAt}Z`) }));
  const productUrls = products.filter((product) => product.indexable).map((product) => ({ url: `${PRODUCTION_URL}/productos/${product.slug}/`, lastModified: new Date(`${product.updatedAt}Z`) }));
  return [...base, ...categoryUrls, ...productUrls];
}
