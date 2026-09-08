-- ============================================================================
-- Función RPC: increment_product_stock_batch
-- Dominio: Stock (#122)
-- ============================================================================
-- Reemplaza el patrón de "Ingreso de Stock" (POST /api/stock/entry) de
-- antes de #122: un supabase.rpc('increment_product_stock', ...) por
-- entrada, disparados con Promise.all desde TypeScript — N round-trips a
-- la base por un solo lote (2º caso de N+1 del audit #106, el 1er caso ya
-- resuelto en categories/reorder).
--
-- Convención elegida: un solo RPC, best-effort por fila DENTRO de la
-- función — cada entrada corre en su propio bloque BEGIN/EXCEPTION, que en
-- plpgsql es un savepoint implícito de Postgres. Si una entrada falla (sin
-- stock del producto en esta Store, incremento <= 0, lo que sea), esa fila
-- revierte sola sin tocar las demás ni abortar la función completa — mismo
-- comportamiento observable que el Promise.all de antes (una fila que
-- falla no frena al resto), pero en un solo viaje a la base en vez de N.
--
-- Delega la validación de cada fila a increment_product_stock() en vez de
-- reimplementarla acá (is_store_admin, ownership del producto,
-- incremento > 0, el upsert en sí) — evita mantener la misma regla de
-- negocio en dos lugares. Reusa esa función tal cual, sin tocar su cuerpo.
--
-- Formato de p_entries: JSONB array de {"product_id", "increment", "notes"}
-- (mismo shape que StockEntryInput en TS). Devuelve JSONB array de
-- {"product_id", "success", "error"?} — mismo shape que StockEntryResult,
-- ya no armado en TypeScript sino directo por la función.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_product_stock_batch(
  p_entries  JSONB,
  p_store_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry      JSONB;
  v_product_id INTEGER;
  v_results    JSONB := '[]'::JSONB;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_product_id := (v_entry->>'product_id')::INTEGER;

    BEGIN
      PERFORM public.increment_product_stock(
        v_product_id,
        (v_entry->>'increment')::NUMERIC,
        p_store_id,
        v_entry->>'notes'
      );
      v_results := v_results || jsonb_build_object('product_id', v_product_id, 'success', true);
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object('product_id', v_product_id, 'success', false, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN v_results;
END;
$$;

COMMENT ON FUNCTION public.increment_product_stock_batch IS 'Ingreso de stock por lote, un solo round-trip, best-effort por fila (savepoint implícito por entrada) — reemplaza el patrón de N llamadas a increment_product_stock() desde TypeScript (#122, audit #106).';
