export type AdminRole = 'super_admin' | 'admin';

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  active?: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
};

export type ProductStatus = 'draft' | 'published' | 'archived';

export type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  categoryId: number | null;
  shortDescription: string | null;
  description: string | null;
  benefits: string | null;
  uses: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stockQuantity: number | null;
  stockStatus: string;
  deliveryText: string | null;
  warrantyText: string | null;
  status: ProductStatus;
  published: boolean;
  featured: boolean;
  featuredOrder: number;
  onSale: boolean;
  saleOrder: number;
  newArrival: boolean;
  newOrder: number;
  mainImagePath: string | null;
  mainImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
  updatedAt: string;
};

export type ProductImage = {
  id?: number;
  uploadId?: number;
  path: string;
  url: string;
  altText: string | null;
  displayOrder: number;
};

export type ProductSpec = {
  id?: number;
  name: string;
  value: string;
  displayOrder: number;
};

export type Category = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  published: boolean;
  showInMenu: boolean;
  showOnHome: boolean;
  displayOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type HomeSection = {
  id: number;
  sectionKey: 'categories' | 'featured' | 'offers' | 'new_arrivals';
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  displayOrder: number;
};

export type AuditEntry = {
  id: number;
  userId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type Upload = {
  id: number;
  path: string;
  url: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
};
