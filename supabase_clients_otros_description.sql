-- ============================================================
-- Permite múltiples clientes con barrio = 'otros', diferenciados
-- por descripción en manzana_lote
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Eliminar constraint original que forzaba manzana_lote = NULL para 'otros'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS manzana_lote_null_for_otros;

-- 2. Eliminar unique index que limitaba a UN solo cliente 'otros'
DROP INDEX IF EXISTS clients_unique_otros;

-- 3. Nuevo partial index: solo UN cliente 'otros' sin descripción (manzana_lote IS NULL)
--    Los 'otros' con descripción quedan controlados por el unique index existente
--    en (barrio, manzana_lote) que ya cubre AC1/AC2.
CREATE UNIQUE INDEX IF NOT EXISTS clients_unique_otros_sin_desc
  ON clients(barrio)
  WHERE barrio = 'otros' AND manzana_lote IS NULL;
