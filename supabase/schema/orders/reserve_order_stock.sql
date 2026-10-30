-- ============================================================================
-- Función: reserve_order_stock
-- Dominio: Orders (#73)
-- ============================================================================
-- Descuenta (con lock) el stock de una línea de pedido — combo-aware — y
-- devuelve su Faltante (ver CONTEXT.md). Extraída de create_order() (#73):
-- la misma lógica estaba copiada, con variantes, en create_order() y en
-- adjust_stock_on_item_update() — cualquier cambio a esta regla exigía
-- acordarse de tocar las dos, que es justo el tipo de descoordinación que
-- ya causó incidentes reales en esta función (ver create_order.sql).
--
-- #160 (spec #157, ADR-0016): nunca rechaza. Siempre descuenta (por
-- componente en un combo), aunque el stock quede negativo, y devuelve
-- shortfall: cuánto faltaba respecto de lo Disponible antes de descontar,
-- en las mismas unidades que p_quantity (combos para un combo). Lo
-- Disponible sale de get_available_stock() (Stock, #159) — la misma regla
-- que muestra el catálogo, no una copia. Qué hacer con un Faltante lo
-- decide el caller: create_order() lo guarda en el ítem;
-- adjust_stock_on_item_update() todavía rechaza la edición (lo retira #161).
--
-- Firma anterior a #160, con otro tipo de retorno (CREATE OR REPLACE no
-- puede cambiarlo — DROP operativo antes de crear esta, ver paso 4 de
-- docs/agents/schema-changes.md):
--   reserve_order_stock(p_product_id integer, p_quantity numeric,
--     p_store_id integer, OUT success boolean, OUT available numeric)
--   DROP FUNCTION public.reserve_order_stock(integer, numeric, integer);
--
-- Producto (o componente) sin fila de stock: se crea en 0 y se descuenta
-- como cualquier otro, así queda en negativo — la cuenta a la vista y la
-- devolución de return_order_stock() simétrica. updated_by de esa fila
-- (alimenta stock_movement_log.performed_by, NOT NULL) es el usuario que
-- hace el pedido si es Store admin o Platform admin (POS), si no el Store admin más
-- antiguo de la Store — nunca un comprador logueado del catálogo. Mismo
-- sentido que ya tiene performed_by en una venta: el último admin que tocó
-- la fila, no quien compró (decisión de Andrés en #160). Una Store sin
-- ningún Store admin no puede crear esa fila (provision_store siempre crea
-- uno).
--
-- Combo sin componentes: no descuenta nada y su Faltante es la cantidad
-- entera — su Disponible es 0 (get_available_stock), igual que en el
-- catálogo. Antes de #160 una suba de cantidad de ese combo en la edición
-- se aceptaba; hasta #161 se rechaza, como cualquier otro Faltante.
--
-- Los componentes de un combo se lockean en orden de product_id. Eso evita
-- trabas solo dentro de una línea: create_order() sigue lockeando ítem por
-- ítem en el orden del carrito (como antes de #160), y no puede reordenar
-- porque add_order_item_variedades correlaciona por orden de inserción.
--
-- El UPDATE ... FROM unnest(...) aplica una sola vez por fila de stock: se
-- apoya en UNIQUE (combo_product_id, component_product_id) de
-- combo_components (un componente no se repite en un combo).
--
-- No-op sin locks si la Store no trackea stock (is_stock_tracked, #97,
-- ADR-0012): shortfall NULL — encapsula acá el chequeo que antes repetían
-- las 4 funciones llamadas por separado.
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
-- nunca directo desde la API. Desde #160 eso importa más: inserta en
-- product_stock y lee store_admins, y solo puede porque esos callers son
-- SECURITY DEFINER (corre con sus permisos). Un caller nuevo también tiene
-- que serlo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_order_stock(
  p_product_id INTEGER,
  p_quantity   NUMERIC(12, 3),
  p_store_id   INTEGER,
  OUT shortfall NUMERIC(12, 3)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_combo  BOOLEAN;
  v_ids       INTEGER[];
  v_per_unit  NUMERIC[];
  v_available NUMERIC(12, 3);
  v_performer UUID;
BEGIN
  shortfall := NULL;

  IF NOT is_stock_tracked(p_store_id) THEN
    RETURN;
  END IF;

  SELECT is_combo INTO v_is_combo FROM products WHERE id = p_product_id;

  -- Qué filas de stock se descuentan y cuánto por unidad pedida: cada
  -- componente de un combo, o el producto mismo.
  IF v_is_combo THEN
    SELECT array_agg(component_product_id ORDER BY component_product_id),
           array_agg(quantity ORDER BY component_product_id)
    INTO v_ids, v_per_unit
    FROM combo_components WHERE combo_product_id = p_product_id;
  ELSE
    v_ids      := ARRAY[p_product_id];
    v_per_unit := ARRAY[1];
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_ids) AS t(product_id)
    WHERE NOT EXISTS (SELECT 1 FROM product_stock ps WHERE ps.product_id = t.product_id)
  ) THEN
    IF auth.uid() IS NOT NULL AND is_store_admin(p_store_id) THEN
      v_performer := auth.uid();
    ELSE
      SELECT profile_id INTO v_performer FROM store_admins
      WHERE store_id = p_store_id ORDER BY created_at, id LIMIT 1;
    END IF;

    INSERT INTO product_stock (product_id, quantity, store_id, updated_by)
    SELECT t.product_id, 0, p_store_id, v_performer
    FROM unnest(v_ids) AS t(product_id)
    ON CONFLICT (product_id) DO NOTHING;
  END IF;

  PERFORM 1 FROM product_stock
  WHERE product_id = ANY (v_ids)
  ORDER BY product_id
  FOR UPDATE;

  -- Disponible leído después del lock: ve el stock que ya descontaron los
  -- pedidos que tenían la fila y los ítems anteriores de este mismo pedido.
  SELECT available INTO v_available
  FROM get_available_stock(p_store_id, ARRAY[p_product_id]);

  shortfall := GREATEST(p_quantity - COALESCE(v_available, 0), 0);

  UPDATE product_stock ps
  SET quantity = ps.quantity - p_quantity * t.per_unit
  FROM unnest(v_ids, v_per_unit) AS t(product_id, per_unit)
  WHERE ps.product_id = t.product_id;
END;
$$;
