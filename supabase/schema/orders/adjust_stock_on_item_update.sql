-- ============================================================================
-- Función trigger: adjust_stock_on_item_update
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara BEFORE UPDATE OF quantity ON order_items (ver order_items.sql).
-- Solo ajusta stock para órdenes 'pending' (admin edita cantidad de un
-- ítem). Si el producto es combo, ajusta cada componente proporcionalmente;
-- si no, ajusta el producto directo.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22: la
-- versión vigente es la combo-aware de supabase_combos.sql (PART 1h), NO
-- la versión simple de supabase_orders_v2.sql (PART 4) — mismo reemplazo
-- limpio que cancel_order (misma firma, sin parámetros, ninguna función
-- trigger los tiene).
--
-- #97 (ADR-0012): con is_stock_tracked(NEW.store_id) = false, no ajusta
-- product_stock — mismo criterio que create_order.sql.
--
-- #73: el chequeo+descuento (rama de suba) y la devolución (rama de baja)
-- se extrajeron a reserve_order_stock()/return_order_stock() — vivían
-- duplicados acá, en create_order() y (la devolución) en
-- cancel_order()/return_stock_on_item_delete(). (Hasta #161 la rama de
-- suba rechazaba con "Stock insuficiente"; ese mensaje ya no existe.)
--
-- #160: reserve_order_stock() ya no rechaza — descuenta siempre y devuelve
-- el Faltante.
--
-- #161 (spec #157, ADR-0016): la edición tampoco rechaza. Una suba que no
-- alcanza descuenta igual y el stock puede quedar negativo (por componente
-- en un combo). Ignora el Faltante que devuelve reserve_order_stock() y no
-- escribe order_items.shortfall: el Faltante es la foto del momento en que
-- se creó el pedido, una edición no lo cambia.
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_stock_on_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
  v_diff         NUMERIC(12, 3);
BEGIN
  SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;

  IF v_order_status != 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.quantity = OLD.quantity THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_diff := NEW.quantity - OLD.quantity;

  IF v_diff > 0 THEN
    PERFORM set_config('app.movement_type', 'sale', true);

    PERFORM reserve_order_stock(NEW.product_id, v_diff, NEW.store_id);
  ELSE
    PERFORM set_config('app.movement_type', 'return', true);
    PERFORM return_order_stock(NEW.product_id, ABS(v_diff), NEW.store_id);
  END IF;

  RETURN NEW;
END;
$$;
