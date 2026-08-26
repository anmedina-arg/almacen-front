-- ============================================================================
-- Función trigger: validate_order_item_store + trigger trg_validate_order_item_store
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- #103 (incidente en producción, orden #4904/item #11924): create_order() y
-- POST /api/orders/[orderId]/items insertaban en order_items cualquier
-- product_id que llegara del caller, sin chequear nunca que perteneciera a
-- la misma Store que la orden — un pedido de la Store A podía terminar con
-- un ítem de un producto real de la Store B. Esto se combinó con
-- get_recommendations() sugiriendo productos de otras tiendas en el
-- checkout (ver get_recommendations.sql) para hacerlo explotable desde la
-- UI pública, pero el problema de fondo es este: nada impedía la escritura
-- en sí, en ningún código que la intentara.
--
-- En vez de repetir "el producto pertenece a esta Store" en cada caller
-- (create_order, el endpoint de admin, y lo que se agregue después), se
-- aplica una sola vez acá — imposible de esquivar sin importar el camino de
-- escritura. product_id nullable (ON DELETE SET NULL) se deja pasar: un
-- ítem con producto borrado no tiene ownership que validar, ya está
-- contemplado en el resto del dominio (ver return_stock_on_item_delete.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_order_item_store()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = NEW.product_id AND store_id = NEW.store_id
  ) THEN
    RAISE EXCEPTION 'product_id % no pertenece a la store %', NEW.product_id, NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$;
