import { getDb } from '@/lib/db';
import { ok, route } from '@/lib/http/response';
import { listPublicCategories, serializePublicCategory } from '@/lib/repos/categories';
import { listHomeSections } from '@/lib/repos/home';
import {
  categorySlugMap,
  listCuratedPublicProducts,
  serializePublicProduct,
  type ProductRow,
} from '@/lib/repos/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SectionPayload = {
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  displayOrder: number;
  items: unknown[];
};

/**
 * Returns only enabled sections, in their configured order, each already filled
 * with the cards that belong to it in their own configured order.
 */
export const GET = route(async () => {
  const db = getDb();
  const sections: SectionPayload[] = [];

  const withCategorySlug = (rows: ProductRow[]) => {
    const slugs = categorySlugMap(db, rows);
    return rows.map((row) =>
      serializePublicProduct(row, {
        categorySlug: row.category_id === null ? null : (slugs.get(row.category_id) ?? null),
      }),
    );
  };

  for (const section of listHomeSections(db, { onlyEnabled: true })) {
    let items: unknown[] = [];

    switch (section.section_key) {
      case 'categories':
        items = listPublicCategories(db, { onlyHome: true }).map(serializePublicCategory);
        break;
      case 'featured':
        items = withCategorySlug(listCuratedPublicProducts(db, 'featured'));
        break;
      case 'offers':
        items = withCategorySlug(listCuratedPublicProducts(db, 'on_sale'));
        break;
      case 'new_arrivals':
        items = withCategorySlug(listCuratedPublicProducts(db, 'new_arrival'));
        break;
      default:
        items = [];
    }

    sections.push({
      sectionKey: section.section_key,
      title: section.title,
      subtitle: section.subtitle,
      displayOrder: section.display_order,
      items,
    });
  }

  return ok({ sections });
});
