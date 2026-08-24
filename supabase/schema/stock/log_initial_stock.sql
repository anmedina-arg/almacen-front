-- ============================================================================
-- Función trigger: log_initial_stock
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Registra en stock_movement_log la carga inicial cuando se crea un
-- registro de product_stock con quantity > 0. Disparada por el trigger
-- on_stock_created (ver product_stock.sql). Ver el gap conocido de #52
-- documentado en stock_movement_log.sql — no setea store_id.
-- Verificado contra producción el 2026-08-22, sin cambios desde
-- supabase_stock_control.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_initial_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity > 0 THEN
    INSERT INTO public.stock_movement_log (
      product_id,
      movement_type,
      previous_qty,
      new_qty,
      performed_by,
      notes
    ) VALUES (
      NEW.product_id,
      'initial_count',
      0,
      NEW.quantity,
      NEW.updated_by,
      COALESCE(NEW.notes, 'Carga inicial de stock')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
