-- ============================================================================
-- Función RPC: get_available_stock
-- Dominio: Stock (#159, spec #157, ver ADR-0016)
-- ============================================================================
-- Devuelve el Disponible (ver CONTEXT.md) de los productos de una Store: la
-- única definición que usa el catálogo público, y que #160 va a reusar al
-- registrar el pedido para calcular el Faltante.
--
--   - Sin Control de stock (is_stock_tracked = false): ninguna fila. El
--     catálogo lo lee como "esta Store no lleva la cuenta", aunque queden
--     filas viejas en product_stock de cuando la flag estaba prendida.
--   - Producto común: su fila de product_stock; 0 si no tiene fila.
--   - Combo: cuántos combos completos alcanzan con el stock de sus
--     componentes, FLOOR(MIN(stock_componente / cantidad_componente)). Un
--     componente sin fila cuenta como 0, y un combo sin componentes también
--     da 0. products.max_stock NO entra en la regla, a propósito (decisión
--     de Andrés en #159): hoy solo lo muestra /admin/stock y el CSV de
--     informes, y no tiene efecto en la venta.
--   - Nunca negativo. Hoy product_stock tiene CHECK (quantity >= 0), pero
--     #160 lo retira (el Descuento de stock puede dejarlo negativo) y un
--     stock negativo tiene que leerse como Disponible 0.
--
-- p_product_ids NULL = todos los productos de la Store (catálogo completo,
-- un solo roundtrip, #148); con lista = solo esos (búsqueda/paginación, cache
-- por producto de #146).
--
-- No reusa get_combo_effective_stock() (Combos): esa función calcula un combo
-- por llamada, lo que acá serían cientos de llamadas por catálogo completo,
-- y no acota por Store ni a 0. Queda para sus callers actuales.
--
-- SECURITY INVOKER a propósito: lee lo mismo que ya lee el catálogo público
-- (products, product_stock y combo_components tienen lectura pública por
-- RLS), así que un visitante anónimo solo ve el Disponible de productos
-- activos — los mismos que ve en el catálogo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_stock(
  p_store_id INTEGER,
  p_product_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE (
  product_id INTEGER,
  available NUMERIC(12, 3)
)
LANGUAGE sql
STABLE
AS $$
  WITH combo_capacity AS (
    SELECT
      cc.combo_product_id,
      FLOOR(MIN(GREATEST(COALESCE(ps.quantity, 0), 0) / NULLIF(cc.quantity, 0))) AS capacity
    FROM public.combo_components cc
    LEFT JOIN public.product_stock ps ON ps.product_id = cc.component_product_id
    WHERE cc.store_id = p_store_id
      AND (p_product_ids IS NULL OR cc.combo_product_id = ANY (p_product_ids))
    GROUP BY cc.combo_product_id
  )
  SELECT
    p.id AS product_id,
    GREATEST(
      CASE
        WHEN p.is_combo THEN COALESCE(cap.capacity, 0)
        ELSE COALESCE(ps.quantity, 0)
      END,
      0
    ) AS available
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id AND NOT p.is_combo
  LEFT JOIN combo_capacity cap ON cap.combo_product_id = p.id
  WHERE p.store_id = p_store_id
    AND public.is_stock_tracked(p_store_id)
    AND (p_product_ids IS NULL OR p.id = ANY (p_product_ids));
$$;

GRANT EXECUTE ON FUNCTION public.get_available_stock(INTEGER, INTEGER[]) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_available_stock IS 'Disponible de los productos de una Store (#159, ver CONTEXT.md): stock propio, o combos completos que alcanzan con sus componentes; 0 sin fila; nunca negativo. Sin Control de stock no devuelve filas.';
