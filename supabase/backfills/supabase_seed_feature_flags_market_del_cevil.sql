-- ============================================================================
-- Seed #23: feature_flags de market-del-cevil (las 8 en true)
-- ============================================================================
-- feature_flags se agrega con DEFAULT '{}' (sin claves) — para market-del-cevil
-- específicamente, ese default es un estado inválido según el catálogo de #23
-- ("todas requeridas"): esta Store ya usa las 8 features hoy (nunca estuvieron
-- gateadas antes de #23), así que sembrar todo en true replica el
-- comportamiento actual, no lo cambia.
--
-- yo-heladerias (la otra Store existente) NO se siembra acá a propósito —
-- fuera del alcance explícito de #23 (su AC solo pide sembrar
-- market-del-cevil). Con el DEFAULT '{}', sus 8 features quedan apagadas
-- hasta que alguien las prenda a mano vía SQL Editor (ADR-0006) — es un
-- cambio de comportamiento real para esa Store, no solo "sin tocar", y
-- vale la pena confirmarlo con el negocio antes de asumir que está bien.
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
WHERE slug = 'market-del-cevil';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT slug, feature_flags FROM public.stores ORDER BY slug;
