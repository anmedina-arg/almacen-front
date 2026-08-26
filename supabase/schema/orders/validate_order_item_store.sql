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
-- Esta es la verificación real, imposible de esquivar sin importar el
-- camino de escritura — POST /api/orders/[orderId]/items también rechaza
-- el mismo caso de forma explícita (400 con mensaje claro), pero como
-- capa de UX encima de esta, no como sustituto: sin este trigger, un
-- caller nuevo que se olvide de chequear ownership (como pasaba antes acá
-- mismo) volvería a abrir el mismo agujero. product_id nullable (ON DELETE
-- SET NULL) se deja pasar: un ítem con producto borrado no tiene ownership
-- que validar, ya está contemplado en el resto del dominio (ver
-- return_stock_on_item_delete.sql).
--
-- Sin SECURITY DEFINER a propósito, a diferencia de los triggers hermanos
-- de este archivo (adjust_stock_on_item_update, return_stock_on_item_delete
-- sí lo necesitan, escriben en product_stock bajo RLS restrictiva) — acá
-- solo se lee products, y no hace falta elevar privilegios en ninguno de
-- los dos caminos de escritura que dispara: desde create_order() (ya
-- SECURITY DEFINER) esta lectura hereda esos permisos elevados igual;
-- desde POST /api/orders/[orderId]/items, el admin invocante ya puede ver
-- los productos de su propia Store vía RLS ("Admins can view all
-- products"), y si el intento es cross-store con un producto inactivo de
-- otra Store, la fila ni siquiera es visible para esa sesión — la policy
-- de RLS rechaza por su cuenta, mismo resultado que el chequeo explícito
-- de abajo.
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
