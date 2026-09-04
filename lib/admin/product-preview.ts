import type { ProductCardData } from '@/components/catalog/ProductCard';
import type { ProductImage } from './types';

export type PreviewSource = {
  name: string;
  shortDescription: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  mainImagePath: string;
  featured: boolean;
  onSale: boolean;
};

/** Builds the public-card contract directly from unsaved form state. */
export function buildProductPreview(source: PreviewSource, images: ProductImage[]): ProductCardData {
  const image = images.find((item) => item.path === source.mainImagePath) ?? images[0];
  return {
    name: source.name,
    shortDescription: source.shortDescription,
    price: source.price === '' ? null : Number(source.price),
    compareAtPrice: source.compareAtPrice === '' ? null : Number(source.compareAtPrice),
    currency: source.currency,
    imageUrl: image?.url,
    imageAlt: image?.altText,
    featured: source.featured,
    onSale: source.onSale,
  };
}
