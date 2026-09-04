import type { Db } from '@/lib/db';
import {
  getPublicCategoryBySlug,
  listPublicChildCategories,
  listPopulatedPublicCategories,
  serializePublicCategory,
} from '@/lib/repos/categories';
import { listHomeSections } from '@/lib/repos/home';
import {
  categorySlugMap,
  getPublicProductBySlug,
  listCuratedPublicProducts,
  listProductImages,
  listProductSpecs,
  listPublicProducts,
  listRelatedPublicProducts,
  serializePublicProduct,
  type ProductRow,
} from '@/lib/repos/products';

export type PublicProduct = ReturnType<typeof serializePublicProduct>;
export type PublicCategory = ReturnType<typeof serializePublicCategory>;
export type PublicHomeSection = {
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  displayOrder: number;
  items: Array<PublicProduct | PublicCategory>;
};

export function serializePublicProducts(db: Db, rows: ProductRow[]): PublicProduct[] {
  const slugs = categorySlugMap(db, rows);
  return rows.map((row) =>
    serializePublicProduct(row, {
      categorySlug: row.category_id === null ? null : (slugs.get(row.category_id) ?? null),
    }),
  );
}

export function getPublicNavigationCategories(db: Db): PublicCategory[] {
  return listPopulatedPublicCategories(db, { onlyMenu: true }).map(serializePublicCategory);
}

export function getPublicCatalog(db: Db): { products: PublicProduct[]; categories: PublicCategory[] } {
  return {
    products: serializePublicProducts(db, listPublicProducts(db)),
    categories: listPopulatedPublicCategories(db).map(serializePublicCategory),
  };
}

export function getPublicCategoryPage(db: Db, slug: string) {
  const category = getPublicCategoryBySlug(db, slug);
  if (!category) return undefined;
  return {
    category: serializePublicCategory(category),
    children: listPublicChildCategories(db, category.id).map(serializePublicCategory),
    products: serializePublicProducts(db, listPublicProducts(db, { categoryId: category.id })),
  };
}

export function getPublicProductPage(db: Db, slug: string) {
  const row = getPublicProductBySlug(db, slug);
  if (!row) return undefined;
  const category = row.category_id === null ? undefined : getPublicCategoryBySlug(
    db,
    (db.prepare('SELECT slug FROM categories WHERE id = ?').get(row.category_id) as { slug: string } | undefined)?.slug ?? '',
  );
  return {
    product: serializePublicProduct(row, {
      images: listProductImages(db, row.id),
      specs: listProductSpecs(db, row.id),
      categorySlug: category?.slug ?? null,
    }),
    category: category ? serializePublicCategory(category) : null,
    related: serializePublicProducts(db, listRelatedPublicProducts(db, row)),
  };
}

/** Enabled Home sections, in Admin order, omitting collections with no public content. */
export function getPublicHomeSections(db: Db): PublicHomeSection[] {
  const sections: PublicHomeSection[] = [];
  for (const section of listHomeSections(db, { onlyEnabled: true })) {
    let items: Array<PublicProduct | PublicCategory> = [];
    switch (section.section_key) {
      case 'categories':
        items = listPopulatedPublicCategories(db, { onlyHome: true }).map(serializePublicCategory);
        break;
      case 'featured':
        items = serializePublicProducts(db, listCuratedPublicProducts(db, 'featured'));
        break;
      case 'offers':
        items = serializePublicProducts(db, listCuratedPublicProducts(db, 'on_sale'));
        break;
      case 'new_arrivals':
        items = serializePublicProducts(db, listCuratedPublicProducts(db, 'new_arrival'));
        break;
    }
    if (items.length > 0) {
      sections.push({
        sectionKey: section.section_key,
        title: section.title,
        subtitle: section.subtitle,
        displayOrder: section.display_order,
        items,
      });
    }
  }
  return sections;
}
