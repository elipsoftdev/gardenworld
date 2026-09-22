export type Migration = {
  id: number;
  name: string;
  sql: string;
};

/**
 * Ordered, append-only list of schema migrations.
 * Never edit an applied migration: add a new one instead.
 */
export const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_path TEXT,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  show_in_menu INTEGER NOT NULL DEFAULT 0 CHECK (show_in_menu IN (0, 1)),
  show_on_home INTEGER NOT NULL DEFAULT 0 CHECK (show_on_home IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_published ON categories(published, display_order);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT,
  brand TEXT,
  model TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  short_description TEXT,
  description TEXT,
  benefits TEXT,
  uses TEXT,
  price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  compare_at_price REAL CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  stock_status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock', 'out_of_stock', 'preorder', 'discontinued')),
  delivery_text TEXT,
  warranty_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  featured_order INTEGER NOT NULL DEFAULT 0,
  on_sale INTEGER NOT NULL DEFAULT 0 CHECK (on_sale IN (0, 1)),
  sale_order INTEGER NOT NULL DEFAULT 0,
  new_arrival INTEGER NOT NULL DEFAULT 0 CHECK (new_arrival IN (0, 1)),
  new_order INTEGER NOT NULL DEFAULT 0,
  main_image_path TEXT,
  seo_title TEXT,
  seo_description TEXT,
  indexable INTEGER NOT NULL DEFAULT 1 CHECK (indexable IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_visibility ON products(status, published, deleted_at);
CREATE INDEX idx_products_featured ON products(featured, featured_order);
CREATE INDEX idx_products_sale ON products(on_sale, sale_order);
CREATE INDEX idx_products_new ON products(new_arrival, new_order);

CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_product_images_product ON product_images(product_id, display_order);

CREATE TABLE product_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_specs_product ON product_specs(product_id, display_order);

CREATE TABLE home_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
`,
  },
  {
    id: 2,
    name: 'category_indexability',
    sql: `
ALTER TABLE categories ADD COLUMN indexable INTEGER NOT NULL DEFAULT 1 CHECK (indexable IN (0, 1));
CREATE INDEX idx_categories_indexable ON categories(published, indexable, display_order);
`,
  },
  {
    id: 3,
    name: 'password_reset_otps',
    sql: [
      'CREATE TABLE password_reset_otps (',
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
      '  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,',
      '  code_hmac TEXT NOT NULL,',
      '  expires_at TEXT NOT NULL,',
      '  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),',
      '  consumed_at TEXT,',
      '  requested_ip TEXT,',
      "  created_at TEXT NOT NULL DEFAULT (datetime('now'))",
      ');',
      'CREATE INDEX idx_password_reset_user ON password_reset_otps(user_id, id);',
      'CREATE INDEX idx_password_reset_expires ON password_reset_otps(expires_at);',
    ].join('\n'),
  },,
  {
    id: 4,
    name: 'user_soft_delete',
    sql: [
      'ALTER TABLE users ADD COLUMN deleted_at TEXT;',
      'CREATE INDEX idx_users_deleted ON users(deleted_at, role, active);',
    ].join('\n'),
  },
];
