-- ============================================================================
-- Fix: super_admin bloqueado por RLS en 6 tablas (9 policies)
-- ============================================================================
-- #13 marcó al dueño de la plataforma como profiles.role = 'super_admin'.
-- El hotfix posterior (#39-#42) corrigió 4 lugares que chequeaban
-- role = 'admin' de forma exacta (verifyAdminAuth y 3 gates de UI), pero ese
-- barrido fue solo sobre código TS/TSX — no sobre policies RLS en SQL.
--
-- Encontrado el 2026-08-19: reportado por el usuario como "el historial de
-- movimientos de stock siempre aparece vacío" en market-del-cevil. Causa:
-- la policy SELECT de stock_movement_log chequea role = 'admin' exacto: con
-- role = 'super_admin', RLS filtra todas las filas en silencio (sin error),
-- así que la pantalla se ve vacía en vez de fallar con un mensaje de
-- permiso denegado — mismo síntoma silencioso que el lockout original.
--
-- Se armó una query contra pg_policies buscando TODA policy viva que
-- mencione role = 'admin' sin mencionar super_admin, para encontrar el resto
-- de una vez (no confiar en que "ya está" tras arreglar el primer síntoma
-- reportado) — dio 9 policies en 6 tablas: category_affinity_rules,
-- clients, combo_components, product_price_history, product_stock (x3),
-- stock_movement_log (x2). Se reproducen acá tal cual estaban, solo
-- agregando el OR de super_admin — sin tocar scoping por Store (eso es
-- territorio de #17/#18, fuera de alcance de este fix).
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage category_affinity_rules" ON public.category_affinity_rules;
CREATE POLICY "Admins can manage category_affinity_rules"
  ON public.category_affinity_rules
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
CREATE POLICY "Admins can manage clients"
  ON public.clients
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can manage combo_components" ON public.combo_components;
CREATE POLICY "Admins can manage combo_components"
  ON public.combo_components
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can view price history" ON public.product_price_history;
CREATE POLICY "Admins can view price history"
  ON public.product_price_history
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can delete stock" ON public.product_stock;
CREATE POLICY "Admins can delete stock"
  ON public.product_stock
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can insert stock" ON public.product_stock;
CREATE POLICY "Admins can insert stock"
  ON public.product_stock
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can update stock" ON public.product_stock;
CREATE POLICY "Admins can update stock"
  ON public.product_stock
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "System can insert stock log" ON public.stock_movement_log;
CREATE POLICY "System can insert stock log"
  ON public.stock_movement_log
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can view stock log" ON public.stock_movement_log;
CREATE POLICY "Admins can view stock log"
  ON public.stock_movement_log
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Debe devolver 0 filas: ninguna policy viva debería seguir sin reconocer
-- super_admin después de este script.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE (qual ILIKE '%role = ''admin''%' OR with_check ILIKE '%role = ''admin''%')
  AND NOT (
    COALESCE(qual, '') ILIKE '%super_admin%'
    OR COALESCE(with_check, '') ILIKE '%super_admin%'
  );
