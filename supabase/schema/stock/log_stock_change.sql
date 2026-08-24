-- ============================================================================
-- Función trigger: log_stock_change
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Registra en stock_movement_log cada UPDATE de quantity en product_stock.
-- El tipo de movimiento se lee de app.movement_type (seteado por
-- upsert_product_stock/increment_product_stock vía set_config antes del
-- UPDATE); si no está seteado, cae a 'manual_adjustment'. Disparada por el
-- trigger on_stock_change (ver product_stock.sql). Ver el gap conocido de
-- #52 documentado en stock_movement_log.sql — no setea store_id.
-- Verificado contra producción el 2026-08-22, sin cambios desde
-- supabase_stock_control.sql (creación original).
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
      notes
    ) VALUES (
      NEW.product_id,
      COALESCE(
        NULLIF(current_setting('app.movement_type', true), ''),
        'manual_adjustment'
      ),
      OLD.quantity,
      NEW.quantity,
      NEW.updated_by,
      NEW.notes
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
