-- ============================================================================
-- Scoping por Store: orders, order_items, order_payments
-- Ticket: #16 (https://github.com/anmedina-arg/almacen-front/issues/16)
-- ============================================================================
-- create_order() gana un p_store_id, seteado en el INSERT a orders. Policies
-- de admin en orders/order_items/order_payments reescritas contra
-- is_store_admin() (función de #15, ya vigente — no se repite el predicado).
--
-- create_order/confirm_order/cancel_order son SECURITY DEFINER — corren con
-- los privilegios del owner de la función, así que BYPASSEAN RLS. La policy
-- puente de acá protege las queries directas (SELECT/UPDATE/DELETE de los
-- admins vía las rutas), pero NO alcanza para confirm_order/cancel_order: la
-- verificación de que la orden pertenece a la Store del caller tiene que
-- hacerse en la ruta, antes de invocar el RPC (ver los route.ts de
-- confirm/cancel). create_order no necesita ese chequeo — ya confía en que
-- el caller (la ruta) armó p_items con productos de la Store correcta,
-- mismo trust boundary que ya tenía antes de este ticket.
--
-- La definición actual de create_order (verificada con pg_get_functiondef
-- en test/producción, no asumida de ningún archivo .sql viejo — ver #49
-- sobre la redefinición dispersa en 6 archivos) se reproduce acá agregando
-- solo p_store_id.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, correr la suite de integración
-- (store-scoping-orders.test.ts), y recién después en producción.
-- ============================================================================

-- ── clients: índices únicos globales -> por Store ───────────────────────
-- Dos índices únicos globales, no por Store. Sus definiciones reales (no
-- las de supabase_clients.sql, que están desactualizadas — el segundo
-- índice fue renombrado/reducido en algún momento sin actualizar ese
-- archivo, confirmado con pg_indexes antes de escribir esto):
--
--   clients_unique_lot ON clients (barrio, manzana_lote) WHERE barrio != 'otros'
--   clients_unique_otros_sin_desc ON clients (barrio)
--     WHERE barrio = 'otros' AND manzana_lote IS NULL
--
-- El segundo es más angosto de lo que el nombre sugiere: NO limita a un
-- solo cliente "otros" en total — permite muchos "otros" con manzana_lote
-- como nota libre (así se usa hoy: "portero", "vino un albañil", etc.),
-- solo exige que haya un único "otros" SIN nota (el catch-all real). Se
-- preserva ese comportamiento, solo scopeado por Store.
DROP INDEX IF EXISTS clients_unique_lot;
CREATE UNIQUE INDEX clients_unique_lot
  ON public.clients (store_id, barrio, manzana_lote)
  WHERE barrio != 'otros';

DROP INDEX IF EXISTS clients_unique_otros_sin_desc;
CREATE UNIQUE INDEX clients_unique_otros_sin_desc
  ON public.clients (store_id, barrio)
  WHERE barrio = 'otros' AND manzana_lote IS NULL;

-- ── create_order(): + p_store_id ────────────────────────────────────────
-- CONSOLIDADO (#49): esta definición pasó a supabase_create_order.sql
-- (fuente única de verdad de acá en más) sin cambios. Cualquier cambio
-- futuro a create_order() va en ese archivo, no en este.
CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_whatsapp_message TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_store_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_order_id         BIGINT;
  v_item             JSONB;
  v_total            NUMERIC(12, 2) := 0;
  v_current_stock    NUMERIC(12, 3);
  v_needed           NUMERIC(12, 3);
  v_product_id       INTEGER;
  v_is_combo         BOOLEAN;
  v_component        RECORD;
  v_component_needed NUMERIC(12, 3);
  v_failed_products  JSONB    := '[]'::JSONB;
  v_has_insufficient BOOLEAN  := FALSE;
BEGIN
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message, store_id)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message, p_store_id)
  RETURNING id INTO v_order_id;

  PERFORM set_config('app.movement_type', 'sale', true);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::INTEGER;
    v_needed     := (v_item->>'quantity')::NUMERIC;

    SELECT is_combo INTO v_is_combo FROM products WHERE id = v_product_id;

    IF v_is_combo THEN
      -- Para combos: verificar y descontar stock de componentes
      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = v_product_id
      LOOP
        v_component_needed := v_needed * v_component.quantity;
        SELECT quantity INTO v_current_stock
        FROM product_stock WHERE product_id = v_component.component_product_id FOR UPDATE;

        IF NOT FOUND OR v_current_stock < v_component_needed THEN
          v_has_insufficient := TRUE;
          v_failed_products  := v_failed_products || jsonb_build_object(
            'id',        v_product_id,
            'name',      v_item->>'product_name',
            'requested', v_needed,
            'available', COALESCE(FLOOR(v_current_stock / NULLIF(v_component.quantity, 0)), 0)
          );
          EXIT;
        END IF;

        UPDATE product_stock
        SET quantity = quantity - v_component_needed
        WHERE product_id = v_component.component_product_id;
      END LOOP;

      IF v_has_insufficient THEN CONTINUE; END IF;
    ELSE
      -- Producto normal
      SELECT quantity INTO v_current_stock
      FROM product_stock WHERE product_id = v_product_id FOR UPDATE;

      IF NOT FOUND OR v_current_stock < v_needed THEN
        v_has_insufficient := TRUE;
        v_failed_products  := v_failed_products || jsonb_build_object(
          'id',        v_product_id,
          'name',      v_item->>'product_name',
          'requested', v_needed,
          'available', COALESCE(v_current_stock, 0)
        );
        CONTINUE;
      END IF;

      UPDATE product_stock
      SET quantity = quantity - v_needed
      WHERE product_id = v_product_id;
    END IF;

    INSERT INTO order_items (
      order_id, product_id, product_name, quantity,
      unit_price, unit_cost, is_by_weight, from_suggestion, store_id
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_item->>'product_name',
      v_needed,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'unit_cost')::NUMERIC, 0),
      COALESCE((v_item->>'is_by_weight')::BOOLEAN, FALSE),
      COALESCE((v_item->>'from_suggestion')::BOOLEAN, FALSE),
      p_store_id
    );

    v_total := v_total + v_needed * (v_item->>'unit_price')::NUMERIC;
  END LOOP;

  IF v_has_insufficient THEN
    RAISE EXCEPTION '%', jsonb_build_object(
      'error',    'insufficient_stock',
      'products', v_failed_products
    )::TEXT;
  END IF;

  UPDATE orders SET total = v_total WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id',    v_order_id,
    'total',       v_total,
    'status',      'pending',
    'items_count', jsonb_array_length(p_items)
  );
END;
$function$;

-- ── orders ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (public.is_store_admin(orders.store_id));

DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (public.is_store_admin(orders.store_id))
  WITH CHECK (public.is_store_admin(orders.store_id));

DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (public.is_store_admin(orders.store_id));

-- "Anyone can create orders" (WITH CHECK true) no se toca: el INSERT real
-- pasa por create_order (SECURITY DEFINER), no por esta policy directamente
-- desde el cliente.

-- ── order_items ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (public.is_store_admin(order_items.store_id));

DROP POLICY IF EXISTS "Admins can update order items" ON order_items;
CREATE POLICY "Admins can update order items"
  ON order_items FOR UPDATE
  USING (public.is_store_admin(order_items.store_id))
  WITH CHECK (public.is_store_admin(order_items.store_id));

DROP POLICY IF EXISTS "Admins can delete order items" ON order_items;
CREATE POLICY "Admins can delete order items"
  ON order_items FOR DELETE
  USING (public.is_store_admin(order_items.store_id));

DROP POLICY IF EXISTS "Admins can insert order items" ON order_items;
CREATE POLICY "Admins can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (public.is_store_admin(order_items.store_id));

-- ── order_payments ───────────────────────────────────────────────────────
-- Era una única policy FOR ALL sin store scoping — se reemplaza por 4
-- policies separadas (mismo patrón que orders/order_items) para que INSERT
-- también pase por is_store_admin() con WITH CHECK explícito.
DROP POLICY IF EXISTS "Admins can manage order payments" ON order_payments;

CREATE POLICY "Admins can view order payments"
  ON order_payments FOR SELECT
  USING (public.is_store_admin(order_payments.store_id));

CREATE POLICY "Admins can insert order payments"
  ON order_payments FOR INSERT
  WITH CHECK (public.is_store_admin(order_payments.store_id));

CREATE POLICY "Admins can update order payments"
  ON order_payments FOR UPDATE
  USING (public.is_store_admin(order_payments.store_id))
  WITH CHECK (public.is_store_admin(order_payments.store_id));

CREATE POLICY "Admins can delete order payments"
  ON order_payments FOR DELETE
  USING (public.is_store_admin(order_payments.store_id));

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_payments')
ORDER BY tablename, cmd;
