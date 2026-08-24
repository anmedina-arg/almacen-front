-- ============================================================================
-- Función trigger: log_stock_change
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Registra en stock_movement_log cada UPDATE de quantity en product_stock.
-- El tipo de movimiento se lee de app.movement_type (seteado por
-- upsert_product_stock/increment_product_stock vía set_config antes del
-- UPDATE); si no está seteado, cae a 'manual_adjustment'. Disparada por el
-- trigger on_stock_change (ver product_stock.sql).
--
-- Setea store_id desde NEW.store_id (#52) — mismo criterio que
-- log_initial_stock() en este archivo/dominio y log_price_change() (#46):
-- NEW es la fila de product_stock que disparó el trigger, no hace falta
-- ningún lookup. product_stock.store_id sigue siendo nullable (puente
-- permisivo, ADR-0008, pendiente de #22).
--
-- Gap encontrado el 2026-08-18 durante #16: la fila insertada nunca llevaba
-- store_id, dejando cada movimiento de stock real con store_id NULL en
-- stock_movement_log — bloqueaba el NOT NULL de #22.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    INSERT INTO public.stock_movement_log (
      product_id,
      movement_type,
      previous_qty,
      new_qty,
      performed_by,
      notes,
      store_id
    ) VALUES (
      NEW.product_id,
      COALESCE(
        NULLIF(current_setting('app.movement_type', true), ''),
        'manual_adjustment'
      ),
      OLD.quantity,
      NEW.quantity,
      NEW.updated_by,
      NEW.notes,
      NEW.store_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
