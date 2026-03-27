-- ============================================================
-- Top Sellers: IDs de los 3 productos más vendidos por categoría
-- Usar DENSE_RANK para manejar empates (si 2 productos empatan
-- en el 3er puesto, ambos reciben el badge)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

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
