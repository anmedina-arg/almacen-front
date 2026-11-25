-- ============================================================================
-- Función trigger: set_order_item_unit_cost
-- Dominio: Orders (#189, spec #179, ver ADR-0018)
-- ============================================================================
-- Dispara BEFORE INSERT ON order_items (ver order_items.sql). Fija el unit_cost
-- del ítem al crearlo: el costo vigente del producto (product_costs) normalizado por
-- el precio, para que funcione tanto para POS (unit_price = price) como WhatsApp
-- (unit_price normalizado por gramo): unit_price * (costo / precio efectivo).
-- Sin costo registrado, o con precio 0, el ítem queda con unit_cost 0 ("sin costo").
--
-- Antes de #189 lo calculaba la capa de servicios leyendo products.cost, columna pública
-- del catálogo. El Costo ya no es público (product_costs solo lo ve el Store admin), y el
-- checkout público de WhatsApp crea pedidos con la sesión del visitante, que no puede
-- leerlo: por eso el cálculo vive acá, SECURITY DEFINER.
--
-- El snapshot es histórico: cambiar el costo después no toca ítems que ya tienen costo
-- (solo corrige los de unit_cost 0, ver sync_order_items_unit_cost).
--
-- Solo completa el ítem que llega con unit_cost 0 u omitido, que es lo que manda la capa de
-- servicios desde #189. Si quien inserta ya trae un costo se respeta: así el trigger se puede
-- aplicar antes de desplegar el código nuevo sin pisar el costo que calcula el código viejo.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_order_item_unit_cost()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
  v_cost  NUMERIC;
BEGIN
  IF COALESCE(NEW.unit_cost, 0) <> 0 THEN
    RETURN NEW;
  END IF;

  SELECT public.effective_price(p) INTO v_price FROM products p WHERE p.id = NEW.product_id;
  SELECT cost INTO v_cost FROM product_costs WHERE product_id = NEW.product_id;

  NEW.unit_cost := CASE
    WHEN v_price > 0 AND v_cost IS NOT NULL THEN NEW.unit_price * (v_cost / v_price)
    ELSE 0
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
