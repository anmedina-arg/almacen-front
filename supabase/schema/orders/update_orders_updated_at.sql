-- ============================================================================
-- Función trigger: update_orders_updated_at
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara BEFORE UPDATE ON orders (ver orders.sql). Específica de esta
-- tabla — no confundir con la genérica update_updated_at_column() usada
-- por Stock/Store/otras tablas.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_orders.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
