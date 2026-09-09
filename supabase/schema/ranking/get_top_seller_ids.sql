-- ============================================================================
-- Función: get_top_seller_ids
-- Dominio: Ranking (#89, spec #81, mapa #74). Scoping por Store: #142
-- (hijo de spec #139), a partir del gap dejado a propósito en #20.
-- ============================================================================
-- IDs de los top 3 productos más vendidos por subcategoría, en una ventana
-- de días. Usa DENSE_RANK para manejar empates (si 2 productos empatan en
-- el 3er puesto, ambos reciben el badge). Usada para el badge "más
-- vendido" del catálogo público (fetchPublicProducts.ts) — a diferencia de
-- get_top_products/get_top_categories (dashboard de admin, #20), esta
-- función la llama un visitante anónimo del catálogo, sin sesión. Por eso
-- NO tiene chequeo de autorización tipo is_store_admin() — el fix acá es
-- solo el filtro de datos, mismo criterio que get_top_products
-- (p_store_id requerido, sin default: no hay caller legacy, el único
-- caller se actualiza en el mismo ticket).
--
-- Scoped por Store desde #142: agrega p_store_id (requerido) y filtra
-- o.store_id = p_store_id, igual que get_top_products/get_top_categories.
-- Firma vieja (previa a #142): get_top_seller_ids(p_days integer) —
-- DROP FUNCTION corrido antes del CREATE OR REPLACE para no dejar overload
-- (ver #70).
--
-- Aplicado y confirmado en producción el 2026-09-09: DROP FUNCTION de la
-- firma vieja + CREATE OR REPLACE con la firma nueva, NOTIFY pgrst reload
-- schema, y verificado con pg_get_function_identity_arguments (un solo
-- overload: p_store_id integer, p_days integer) + una llamada real contra
-- Market del Cevil devolviendo productos reales. Aplicado antes al
-- proyecto de test, mismo resultado.
--
-- Trade-off aceptado (code review de #142): p_store_id no tiene guarda
-- explícita contra NULL — a diferencia de get_top_products/
-- get_top_categories, que la rechazan indirectamente vía
-- is_store_admin(NULL) = false, esta función no tiene chequeo de
-- autorización (RPC público, alcanzable directo por REST/RPC sin pasar por
-- fetchTopSellerIds.ts — un tipado de TypeScript ahí no protege este
-- límite). No se agregó una guarda explícita (exigiría pasar de LANGUAGE
-- sql a plpgsql, como get_top_products) porque el peor caso de un
-- p_store_id NULL es inocuo: "o.store_id = p_store_id" es NULL para toda
-- fila, así que devuelve una lista vacía — nunca datos de otra Store. Es
-- justo lo opuesto al bug que este ticket corrige (antes, sin filtro
-- alguno, se veían ventas de todas las Stores); acá el fallback silencioso
-- es "sin badges", no "badges de otra Store".
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_seller_ids(
  p_store_id INT,
  p_days     INT DEFAULT 30
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
      AND o.store_id = p_store_id
      AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND p.subcategory_id IS NOT NULL
    GROUP BY oi.product_id, p.subcategory_id
  )
  SELECT product_id FROM ranked WHERE rnk <= 3;
$$;
