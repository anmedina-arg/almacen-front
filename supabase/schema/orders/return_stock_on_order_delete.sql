-- ============================================================================
-- Función trigger: return_stock_on_order_delete
-- Dominio: Orders (#164)
-- ============================================================================
-- Dispara BEFORE DELETE ON orders (ver orders.sql). Si el pedido está
-- 'pending', devuelve el stock de cada ítem — combo-aware, vía
-- return_order_stock() — porque ese stock se descontó al crear el pedido
-- (#160) y la venta deja de existir: eliminar un pendiente equivale a
-- cancelarlo y borrarlo. Decisión de producto de Andrés, 2026-11-05 (#164).
--
-- En cualquier otro estado no toca el stock:
--   - 'cancelled': ya lo devolvió cancel_order(). Devolverlo otra vez era el
--     bug de #164 (stock duplicado en producción el 2026-10-31).
--   - 'confirmed': la mercadería salió; el admin ve el aviso en la UI y, si
--     hace falta, lo corrige con un ajuste manual de stock.
--
-- Corre BEFORE DELETE para que los ítems todavía existan: con ON DELETE
-- CASCADE se borran después, y para entonces return_stock_on_item_delete()
-- ya no encuentra la orden y no devuelve nada (ver ese archivo).
--
-- ADR-0012 / #97: return_order_stock() es no-op si la Store no trackea
-- stock — acá no hace falta chequearlo aparte.
--
-- El loop sobre order_items es el mismo que el de cancel_order(). Se deja
-- duplicado a propósito: extraerlo a una auxiliar obligaría a tocar
-- cancel_order en producción por un ticket de otro alcance. Si aparece un
-- tercer uso, extraer (mismo criterio que return_order_stock() en #73).
--
-- SECURITY DEFINER (como return_stock_on_item_delete()) y search_path fijo
-- (hardening de cancel_order.sql / log_price_change.sql): el trigger
-- escribe product_stock, que tiene RLS, desde el DELETE de un admin
-- autenticado.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.return_stock_on_order_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- RECORD y no order_items%ROWTYPE: en apply-order.txt este archivo va antes
  -- que orders.sql (que ata el trigger) y por lo tanto antes que
  -- order_items.sql; %ROWTYPE se resuelve al crear la función y fallaría.
  v_item RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM 'pending' THEN
    RETURN OLD;
  END IF;

  -- Tag de auditoría en stock_movement_log: 'return', igual que cancel_order.
  PERFORM set_config('app.movement_type', 'return', true);

  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = OLD.id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      PERFORM return_order_stock(v_item.product_id, v_item.quantity, OLD.store_id);
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$;
