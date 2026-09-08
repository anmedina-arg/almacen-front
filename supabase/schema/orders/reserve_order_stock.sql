-- ============================================================================
-- Función: reserve_order_stock
-- Dominio: Orders (#73)
-- ============================================================================
-- Reserva (chequea + descuenta, con lock) el stock necesario para una línea
-- de pedido — combo-aware. Extraída de create_order() (#73): la misma
-- lógica estaba copiada, con variantes, en create_order() y en
-- adjust_stock_on_item_update() — cualquier cambio a esta regla exigía
-- acordarse de tocar las dos, que es justo el tipo de descoordinación que
-- ya causó incidentes reales en esta función (ver create_order.sql).
--
-- No decide qué hacer si falta stock — devuelve success = false y available
-- (unidades del producto pedido que sí alcanzarían, no la cantidad cruda de
-- un componente) para que el caller decida: create_order() acumula todos
-- los faltantes de la orden y recién al final hace RAISE EXCEPTION;
-- adjust_stock_on_item_update() (un solo ítem) puede raisear apenas vuelve
-- success = false. Ninguno de los dos comportamientos cambia con esta
-- extracción.
--
-- Combo: dos pasadas (chequea+lockea TODOS los componentes primero, recién
-- después descuenta) — evita dejar componentes ya descontados si otro
-- componente más adelante no alcanza. create_order() antes de #73 hacía
-- esto en una sola pasada (podía descontar un componente y recién ahí
-- fallar en el siguiente) — no era un bug real porque el RAISE EXCEPTION
-- final revierte toda la transacción de todos modos, pero la versión de dos
-- pasadas (la que ya tenía adjust_stock_on_item_update()) es más prolija y
-- se adopta como la única versión canónica.
--
-- No-op sin locks si la Store no trackea stock (is_stock_tracked, #97,
-- ADR-0012) — encapsula acá el chequeo que antes repetían las 4 funciones
-- llamadas por separado.
--
-- Trade-off aceptado (code review de #73): create_order() llama a esta
-- función una vez por ítem del carrito, así que is_stock_tracked() se
-- re-consulta por ítem en vez de una sola vez por pedido (como hacía el
-- código antes de extraerse). Es una consulta indexada por PK, costo
-- despreciable para el tamaño típico de un carrito — se prefiere sobre
-- volver a meter la rama "¿trackea stock?" en los 4 callers, que es
-- justo la duplicación que esta extracción elimina.
--
-- Sin GRANT explícito ni SECURITY DEFINER — mismo criterio que
-- is_stock_tracked()/get_combo_effective_stock(): solo se llama desde
-- adentro de otras funciones (create_order, adjust_stock_on_item_update),
-- nunca directo desde la API.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_order_stock(
  p_product_id INTEGER,
  p_quantity   NUMERIC(12, 3),
  p_store_id   INTEGER,
  OUT success   BOOLEAN,
  OUT available NUMERIC(12, 3)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_combo         BOOLEAN;
  v_component        RECORD;
  v_component_needed NUMERIC(12, 3);
  v_current_stock    NUMERIC(12, 3);
BEGIN
  success   := TRUE;
  available := NULL;

  IF NOT is_stock_tracked(p_store_id) THEN
    RETURN;
  END IF;

  SELECT is_combo INTO v_is_combo FROM products WHERE id = p_product_id;

  IF v_is_combo THEN
    -- Pasada 1: lockea y chequea todos los componentes antes de tocar nada.
    FOR v_component IN
      SELECT * FROM combo_components WHERE combo_product_id = p_product_id
    LOOP
      v_component_needed := p_quantity * v_component.quantity;
      SELECT quantity INTO v_current_stock
      FROM product_stock WHERE product_id = v_component.component_product_id FOR UPDATE;

      IF NOT FOUND OR v_current_stock < v_component_needed THEN
        success   := FALSE;
        available := COALESCE(FLOOR(v_current_stock / NULLIF(v_component.quantity, 0)), 0);
        RETURN;
      END IF;
    END LOOP;

    -- Pasada 2: alcanza para todos — recién ahora descuenta.
    FOR v_component IN
      SELECT * FROM combo_components WHERE combo_product_id = p_product_id
    LOOP
      UPDATE product_stock
      SET quantity = quantity - (p_quantity * v_component.quantity)
      WHERE product_id = v_component.component_product_id;
    END LOOP;
  ELSE
    SELECT quantity INTO v_current_stock
    FROM product_stock WHERE product_id = p_product_id FOR UPDATE;

    IF NOT FOUND OR v_current_stock < p_quantity THEN
      success   := FALSE;
      available := COALESCE(v_current_stock, 0);
      RETURN;
    END IF;

    UPDATE product_stock
    SET quantity = quantity - p_quantity
    WHERE product_id = p_product_id;
  END IF;
END;
$$;
