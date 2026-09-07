-- ============================================================================
-- Función: return_order_stock
-- Dominio: Orders (#73)
-- ============================================================================
-- Devuelve (suma, sin lock — no compite por el mínimo, solo repone) el
-- stock de una línea de pedido — combo-aware. Inverso de
-- reserve_order_stock(). Extraída de #73: la misma lógica estaba copiada,
-- con variantes, en cancel_order(), adjust_stock_on_item_update() (rama de
-- cantidad que baja) y return_stock_on_item_delete().
--
-- Siempre "tiene éxito" — devolver stock no tiene condición de fallo, a
-- diferencia de reservarlo (por eso no devuelve nada, a diferencia de
-- reserve_order_stock).
--
-- No-op si la Store no trackea stock (is_stock_tracked, #97, ADR-0012) —
-- mismo criterio que reserve_order_stock().
--
-- Sin GRANT explícito ni SECURITY DEFINER — mismo criterio que
-- is_stock_tracked()/get_combo_effective_stock(): solo se llama desde
-- adentro de otras funciones, nunca directo desde la API.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.return_order_stock(
  p_product_id INTEGER,
  p_quantity   NUMERIC(12, 3),
  p_store_id   INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_combo  BOOLEAN;
  v_component RECORD;
BEGIN
  IF NOT is_stock_tracked(p_store_id) THEN
    RETURN;
  END IF;

  SELECT is_combo INTO v_is_combo FROM products WHERE id = p_product_id;

  IF v_is_combo THEN
    FOR v_component IN
      SELECT * FROM combo_components WHERE combo_product_id = p_product_id
    LOOP
      UPDATE product_stock
      SET quantity = quantity + (p_quantity * v_component.quantity)
      WHERE product_id = v_component.component_product_id;
    END LOOP;
  ELSE
    UPDATE product_stock
    SET quantity = quantity + p_quantity
    WHERE product_id = p_product_id;
  END IF;
END;
$$;
