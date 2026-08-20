-- ============================================================================
-- Scoping por Store: combo_components
-- Ticket: #18 (https://github.com/anmedina-arg/almacen-front/issues/18)
-- ============================================================================
-- Mismo patrón que #15/#16/#17: RLS de escritura-admin reescrita contra
-- is_store_admin() (ya existe desde #15, no se repite acá).
--
-- products.store_id (incluidas las filas is_combo=true) ya está scoped
-- desde #15 — no hace falta tocar esa RLS de nuevo acá, el AC de #18 solo
-- lo menciona como contexto.
--
-- combo_components.store_id ya está 100% backfilleada (80/80 filas,
-- verificado en producción) — no hace falta backfill acá.
--
-- "Public can view combo_components" (USING true) NO se toca — mismo
-- criterio que "Anyone can view stock" en #17 (revertido ahí tras
-- confirmar que sostiene el catálogo público): fetchPublicProducts.ts lee
-- combo_components server-side con la anon key para armar el catálogo
-- público sin login, y ya filtra por store_id a nivel aplicación (vía
-- comboIds derivados de products.store_id). Achicar esta policy rompería
-- esa lectura para cualquier visitante anónimo. Verificado antes de
-- escribir este archivo, no repetido el error de #17.
--
-- sync_combo_cost() y get_combo_effective_stock(p_product_id) no ganan
-- p_store_id: ambas operan sobre un product_id ya resuelto por su
-- caller (el trigger corre sobre la fila que cambió; get_combo_effective_stock
-- se llama desde get_all_products_with_stock, ya scoped por p_store_id desde
-- #17/el fix de la regresión de combos) — agregar el parámetro sería
-- Speculative Generality sin un caller real que lo necesite.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, correr la suite de integración
-- (store-scoping-combos.test.ts), y recién después en producción.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage combo_components" ON public.combo_components;
CREATE POLICY "Admins can manage combo_components"
  ON public.combo_components FOR ALL
  USING (public.is_store_admin(combo_components.store_id))
  WITH CHECK (public.is_store_admin(combo_components.store_id));

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'combo_components'
ORDER BY cmd;
