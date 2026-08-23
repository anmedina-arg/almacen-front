-- ============================================================================
-- Función: get_top_seller_ids
-- Dominio: Ranking (#89, spec #81, mapa #74). Prepara terreno para #20
-- (Scoping por Store: Ranking).
-- ============================================================================
-- IDs de los top 3 productos más vendidos por subcategoría, en una ventana
-- de días. Usa DENSE_RANK para manejar empates (si 2 productos empatan en
-- el 3er puesto, ambos reciben el badge). Usada para el badge "más
-- vendido" en el catálogo.
--
-- NO ESTÁ SCOPED POR STORE — mismo gap que get_top_products/
-- get_top_categories, resuelto en #20, no en #89.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-23 — sin
-- cambios desde supabase_top_sellers.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_seller_ids(
  p_days INT DEFAULT 30
)
RETURNS TABLE (product_id INT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH ranked AS (
    SELECT
      oi.product_id,
      DENSE_RANK() OVER (
        PARTITION BY p.subcategory_id
        ORDER BY SUM(oi.quantity) DESC
      ) AS rnk
    FROM order_items oi
    JOIN orders   o ON oi.order_id   = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status IN ('pending', 'confirmed')
      AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND p.subcategory_id IS NOT NULL
    GROUP BY oi.product_id, p.subcategory_id
  )
  SELECT product_id FROM ranked WHERE rnk <= 3;
$$;
