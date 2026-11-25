-- ============================================================================
-- Función: is_costs_enabled
-- Dominio: Products (#187, spec #179, ver ADR-0012 y ADR-0018)
-- ============================================================================
-- Resuelve si una Store tiene el módulo `costos` (flag `costos` de
-- stores.feature_flags). La usa sync_combo_cost: con la flag apagada el cálculo
-- del costo de un combo no corre y el combo no tiene fila de costo.
--
-- Función dedicada y específica de esta regla, no genérica ("chequear cualquier
-- flag por nombre"), mismo criterio que is_stock_tracked() (#97) y
-- is_store_admin(): se arma una función nueva cuando una regla real la necesita.
-- Devuelve siempre un booleano: false si la Store no existe o si la key
-- `costos` no está seteada (mismo criterio que resolveFeatureFlags en TS para
-- keys faltantes).
--
-- No es pública: solo la llama un trigger que dispara con la sesión de un Store
-- admin (o service_role). Nace sin EXECUTE para anon ni PUBLIC por los privilegios
-- por defecto (#154); el REVOKE queda explícito y no lleva GRANT (authenticated y
-- service_role ya lo conservan, mismo criterio que las demás funciones trigger).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_costs_enabled(p_store_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (feature_flags->>'costos')::boolean FROM public.stores WHERE id = p_store_id),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_costs_enabled(INTEGER) FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
