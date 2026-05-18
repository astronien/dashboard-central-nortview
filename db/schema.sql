-- Readable tables (browse these in Turso dashboard)
-- data_sales, data_targets, data_categories

-- Summary
-- SELECT * FROM upload_meta;

-- Sales (filter by period: current | lastMonth | lastYear)
-- SELECT period, branch_name, product_name, category_name, total_price, doc_date
-- FROM data_sales
-- WHERE period = 'current'
-- LIMIT 50;

-- Targets
-- SELECT * FROM data_targets LIMIT 50;

-- Category mapping
-- SELECT * FROM data_categories LIMIT 50;

-- Raw compressed backup (not human-readable)
-- upload_*_chunks
