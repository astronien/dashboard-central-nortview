-- รันใน Turso SQL Console ได้ (หรือใช้ GET/POST /api/init-db แทน — แอปสร้างให้อัตโนมัติ)

CREATE TABLE IF NOT EXISTS upload_meta (
  kind TEXT PRIMARY KEY,
  row_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS data_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,
  product_code TEXT,
  product_name TEXT,
  category_name TEXT,
  sub_category TEXT,
  branch_name TEXT,
  officer_name TEXT,
  doc_no TEXT,
  doc_date TEXT,
  total_price TEXT,
  bill_amount TEXT,
  quantity TEXT,
  customer_name TEXT,
  extra_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_sales_period ON data_sales(period);

CREATE TABLE IF NOT EXISTS data_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_name TEXT,
  staff_id TEXT,
  first_name TEXT,
  last_name TEXT,
  day TEXT,
  total_target TEXT,
  iphone TEXT,
  mac TEXT,
  ipad TEXT,
  apple_watch TEXT,
  sim TEXT,
  btb TEXT,
  smartphone TEXT,
  extra_json TEXT
);

CREATE TABLE IF NOT EXISTS data_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cat_sub_cat TEXT,
  cat_daily TEXT,
  extra_json TEXT
);

CREATE TABLE IF NOT EXISTS staff_photos (
  staff_id TEXT PRIMARY KEY,
  officer_key TEXT,
  display_name TEXT,
  branch_name TEXT,
  photo_url TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_photos_officer_key ON staff_photos(officer_key);
