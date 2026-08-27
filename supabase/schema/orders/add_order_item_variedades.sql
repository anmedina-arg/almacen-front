-- ============================================================================
-- Función RPC: add_order_item_variedades
-- Dominio: Orders (#95, spec #91, mapa #74)
-- ============================================================================
-- Paso adicional POSTERIOR a create_order() — a propósito no toca su cuerpo
-- (#73: create_order() ya concentra demasiadas responsabilidades, tocarla
-- ya causó incidentes reales pisando features no relacionadas en silencio).
--
-- create_order() no devuelve los ids de order_items que generó, así que acá
-- se reconstruyen por orden de inserción: dentro de su LOOP, los INSERT a
-- order_items pasan en el mismo orden en que trae p_items — así que
-- "ORDER BY id ASC" sobre los order_items de esta orden es el mismo orden
-- que el array p_selections que se manda acá. Si create_order() alguna vez
-- cambia ese orden de inserción, esta correlación posicional se rompe — no
-- hay otra forma de correlacionar sin tocar su cuerpo o agregar una columna
-- nueva a order_items.
--
-- p_selections: JSONB, mismo largo y mismo orden que el array de items que
-- se mandó a create_order(). Cada elemento es [] (línea sin Variedades) o
-- un array de {"id": <variedad_id>, "name": <nombre congelado>}.
--
-- SECURITY DEFINER: igual que create_order(), el checkout público (anon,
-- sin login) necesita poder escribir acá — la policy directa de INSERT en
-- order_item_variedades es solo defensiva (ver order_item_variedades.sql).
--
-- Best-effort a propósito: si esto falla, la orden ya existe completa
-- (create_order() ya confirmó y descontó stock) — no hay rollback
-- compensatorio de la orden por un fallo acá, para no acoplar el checkout
-- core a este detalle. El caller (POST /api/orders) loguea el error pero
-- no falla el request de todos modos.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_order_item_variedades(
  p_order_id INTEGER,
  p_store_id INTEGER,
  p_selections JSONB
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item_ids  BIGINT[];
  v_idx       INTEGER;
  v_selection JSONB;
  v_variedad  JSONB;
BEGIN
  SELECT array_agg(id ORDER BY id) INTO v_item_ids
  FROM order_items
  WHERE order_id = p_order_id AND store_id = p_store_id;

  IF v_item_ids IS NULL
     OR array_length(v_item_ids, 1) IS DISTINCT FROM jsonb_array_length(p_selections) THEN
    RAISE EXCEPTION 'order_items count mismatch for order %', p_order_id;
  END IF;

  FOR v_idx IN 1..array_length(v_item_ids, 1) LOOP
    v_selection := p_selections -> (v_idx - 1);

    IF jsonb_array_length(v_selection) > 0 THEN
      FOR v_variedad IN SELECT * FROM jsonb_array_elements(v_selection)
      LOOP
        INSERT INTO order_item_variedades (order_item_id, variedad_id, variedad_name, store_id)
        VALUES (
          v_item_ids[v_idx],
          (v_variedad->>'id')::INTEGER,
          v_variedad->>'name',
          p_store_id
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- Mismo criterio que create_order(): el checkout público necesita EXECUTE
-- para `anon` además de `authenticated` (ver GRANT de get_recommendations
-- como precedente de una función RPC nueva con acceso anon explícito).
GRANT EXECUTE ON FUNCTION public.add_order_item_variedades(INTEGER, INTEGER, JSONB) TO anon, authenticated;
