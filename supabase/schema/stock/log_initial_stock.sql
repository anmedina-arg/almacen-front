-- ============================================================================
-- Función trigger: log_initial_stock
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Registra en stock_movement_log la carga inicial cuando se crea un
-- registro de product_stock con quantity > 0. Disparada por el trigger
-- on_stock_created (ver product_stock.sql).
--
-- Setea store_id desde NEW.store_id (#52) — NEW es la fila de product_stock
-- que disparó el trigger, así que no hace falta ningún lookup/join. Ojo:
-- product_stock.store_id todavía es nullable (puente permisivo, ADR-0008,
-- pendiente de #22) — si la fila de stock en sí tiene store_id NULL, el
-- movimiento nuevo también queda NULL. Mismo criterio que log_price_change()
-- (#46).
--
-- Gap encontrado el 2026-08-18 durante #16: la fila insertada nunca llevaba
-- store_id, dejando cada carga inicial real con store_id NULL en
-- stock_movement_log — bloqueaba el NOT NULL de #22.
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
      notes,
      store_id
    ) VALUES (
      NEW.product_id,
      'initial_count',
      0,
      NEW.quantity,
      NEW.updated_by,
      COALESCE(NEW.notes, 'Carga inicial de stock'),
      NEW.store_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
