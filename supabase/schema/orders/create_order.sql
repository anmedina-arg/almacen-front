-- ============================================================================
-- Función RPC: create_order — fuente única de verdad (#49)
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- create_order() se venía redefiniendo con CREATE OR REPLACE FUNCTION en 6
-- archivos SQL distintos a lo largo del tiempo (supabase_orders.sql,
-- supabase_orders_v2.sql, supabase_combos.sql, supabase_pricing.sql,
-- supabase_fix_create_order_unit_cost.sql, supabase_recommendations.sql),
-- cada uno agregando una feature — a veces sobre la versión vigente, a
-- veces (documentado, no solo sospechado) sobre una copia vieja, pisando
-- features ya en producción sin querer. Eso ya pasó una vez con unit_cost
-- (ver supabase_fix_create_order_unit_cost.sql, en supabase/_archive/) y
-- volvió a pasar con store_id (#70, overload con
-- supabase_recommendations.sql — ver supabase_fix_create_order_duplicate_overload.sql,
-- en supabase/_archive/).
--
-- Reubicada acá en #84 SIN re-verificar — ya fue verificada contra
-- producción vía pg_get_functiondef el 2026-08-20 (#49), después de
-- eliminar el duplicado de 4 parámetros (#70). Cualquier cambio futuro a
-- create_order() va en este archivo, con CREATE OR REPLACE FUNCTION sobre
-- esta misma firma — no crear un archivo nuevo para tocar esta función.
--
-- GRANTs (histórico, NO re-verificado en #84 — supabase_create_order.sql
-- tampoco los tenía, por eso no se re-escriben acá; ver supabase_orders.sql
-- en supabase/_archive/): esta función necesita EXECUTE para `anon` además
-- de `authenticated` — sostiene el checkout público por WhatsApp sin login.
-- Si se toca la firma de create_order() en el futuro, confirmar contra
-- pg_proc_acl / information_schema.routine_privileges que ambos roles
-- siguen con EXECUTE antes de dar el cambio por completo.
--
-- #97 (ADR-0012): con is_stock_tracked(p_store_id) = false, ningún ítem
-- (combo o no) chequea ni descuenta product_stock — se trata como siempre
-- disponible. Antes de este fix, una Store con stock:false no podía crear
-- NINGÚN pedido (ver is_stock_tracked.sql, dominio Stock, para el porqué).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text,
  p_whatsapp_message text DEFAULT NULL::text,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_store_id integer DEFAULT NULL::integer
)
 RETURNS jsonb
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
  v_stock_tracked    BOOLEAN;
BEGIN
  v_stock_tracked := is_stock_tracked(p_store_id);

  INSERT INTO orders (user_id, status, total, notes, whatsapp_message, store_id)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message, p_store_id)
  RETURNING id INTO v_order_id;

  PERFORM set_config('app.movement_type', 'sale', true);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::INTEGER;
    v_needed     := (v_item->>'quantity')::NUMERIC;

    IF v_stock_tracked THEN
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
