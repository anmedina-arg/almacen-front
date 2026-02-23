-- ============================================================================
-- Block 4: Allow public (anon) read access to product_stock
-- ============================================================================
-- The storefront needs to show stock quantities to customers (not logged in).
-- We open SELECT to everyone — quantities are public catalog info.
-- Write operations (INSERT, UPDATE, DELETE) remain admin-only.
-- ============================================================================

-- Replace the authenticated-only read policy with a public one
DROP POLICY IF EXISTS "Authenticated users can view stock" ON public.product_stock;

CREATE POLICY "Anyone can view stock"
  ON public.product_stock
  FOR SELECT
  USING (true);

-- Verify
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'product_stock'
ORDER BY policyname;
