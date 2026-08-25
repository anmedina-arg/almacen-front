-- ============================================================================
-- Seed #23: feature_flags de las Stores existentes (las 8 en true)
-- ============================================================================
-- feature_flags se agrega con DEFAULT '{}' (sin claves) — para las Stores
-- que ya existen hoy, ese default es un estado inválido según el catálogo
-- de #23 ("todas requeridas"): tanto market-del-cevil como yo-heladerias ya
-- usan las 8 features hoy (nunca estuvieron gateadas antes de #23), así que
-- sembrar todo en true en las dos replica el comportamiento actual, no lo
-- cambia — decisión explícita con el usuario (2026-08-25): el AC original
-- de #23 solo pedía sembrar market-del-cevil, pero dejar yo-heladerias en
-- '{}' le hubiera apagado las 8 features de un día para el otro al aplicar
-- esto en producción, un cambio de comportamiento real no pedido por
-- nadie. Cualquier Store nueva que se dé de alta después sí arranca en
-- '{}' — el super-admin elige qué prender a mano (ADR-0006), como
-- corresponde a una Store nueva.
-- ============================================================================

UPDATE public.stores
SET feature_flags = '{
  "stock": true,
  "combos": true,
  "clientes": true,
  "pagos": true,
  "ranking": true,
  "pos": true,
  "dashboard": true,
  "informes": true
}'::jsonb
WHERE slug IN ('market-del-cevil', 'yo-heladerias');

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT slug, feature_flags FROM public.stores ORDER BY slug;
