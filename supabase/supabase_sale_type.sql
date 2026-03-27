-- =============================================================
-- BLOCK 2: sale_type column in products table
-- Run this in Supabase SQL Editor BEFORE deploying frontend changes
-- =============================================================

-- 1. Add the sale_type column
ALTER TABLE products
ADD COLUMN sale_type TEXT
CHECK (sale_type IN ('unit', '100gr', 'kg'))
NOT NULL
DEFAULT 'unit';

-- 2. Populate from existing product names (one-time migration)
UPDATE products
SET sale_type = CASE
  WHEN LOWER(name) LIKE '%x 100 gr%' THEN '100gr'
  WHEN LOWER(name) LIKE '%x kg%'     THEN 'kg'
  ELSE 'unit'
END;

-- 3. Verify the migration results
SELECT sale_type, COUNT(*) as total
FROM products
GROUP BY sale_type
ORDER BY sale_type;

-- 4. Spot-check: show weight-based products
SELECT id, name, sale_type
FROM products
WHERE sale_type != 'unit'
ORDER BY sale_type, name;
