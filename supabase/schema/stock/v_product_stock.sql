-- ============================================================================
-- Vista: v_product_stock
-- Dominio: Stock
-- ============================================================================
-- Vista legacy del primer control de stock (supabase_stock_control.sql, hoy
-- en _archive/). Verificada contra producción con pg_get_viewdef el
-- 2026-10-17: esta es la definición viva. Quedó fuera de la consolidación
-- de #83 — se documenta acá al armar la base local en Docker, porque la base
-- local tiene que tener todos los objetos que corren en producción.
--
-- Uso actual: la lee GET /api/stock vía stockApiClient (ver
-- src/features/admin/types/stock.types.ts, `ProductStockView`).
--
-- Deuda conocida (no corregida acá):
--   - Expone `p.main_category` (campo legacy; su retiro es parte de #133).
--     Al retirarlo, esta vista cambia y hay que seguir los 8 pasos de
--     docs/agents/schema-changes.md.
--   - No filtra por store_id: depende de que quien la consulte filtre por
--     Store (la API lo hace) y de la RLS de las tablas base, que aplica
--     porque la vista corre con los permisos de quien la invoca
--     (security_invoker no está seteado: en Postgres eso significa que
--     corre como su dueño, `postgres`, que bypassea RLS — el advisor de
--     Supabase la marca por eso, pendiente de decisión).
-- ============================================================================

CREATE OR REPLACE VIEW public.v_product_stock AS
SELECT
  ps.id AS stock_id,
  ps.product_id,
  p.name AS product_name,
  p.price AS product_price,
  p.main_category,
  p.active AS product_active,
  p.image AS product_image,
  ps.quantity,
  ps.min_stock,
  CASE
    WHEN ps.min_stock IS NOT NULL AND ps.quantity <= ps.min_stock THEN true
    ELSE false
  END AS is_low_stock,
  ps.updated_by,
  pr.full_name AS updated_by_name,
  ps.notes,
  ps.updated_at
FROM public.product_stock ps
JOIN public.products p ON p.id = ps.product_id
LEFT JOIN public.profiles pr ON pr.id = ps.updated_by
ORDER BY p.name ASC;
