-- Optional manual migration for Turso (tables are also created on first API request)

CREATE TABLE IF NOT EXISTS upload_target (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  file_name TEXT NOT NULL,
  rows_json TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS upload_current (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  file_name TEXT NOT NULL,
  rows_json TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS upload_last_month (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  file_name TEXT NOT NULL,
  rows_json TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS upload_last_year (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  file_name TEXT NOT NULL,
  rows_json TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS upload_category_master (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  file_name TEXT NOT NULL,
  rows_json TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
