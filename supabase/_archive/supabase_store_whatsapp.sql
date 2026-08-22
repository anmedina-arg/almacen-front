-- ============================================================================
-- Número de WhatsApp propio por Store (#24)
-- ============================================================================
-- Migración puramente aditiva: agrega whatsapp_number (nullable) a stores.
-- NULL significa "sin número propio configurado" -> el código usa
-- NEXT_PUBLIC_WHATSAPP_NUMBER como fallback (ver
-- src/features/catalog/utils/resolveWhatsappNumber.ts), así que
-- market-del-cevil no cambia de comportamiento hasta que se le cargue un
-- número propio.
--
-- Alta/edición del número por Store es manual vía SQL Editor por ahora
-- (mismo patrón que el resto del alta de Stores, ADR-0006) — no hay UI de
-- admin para esto en este primer corte.
--
-- stores ya tiene RLS habilitada con policy "Anyone can read stores" (ver
-- supabase_stores_read_policy.sql) que cubre todas las columnas — no hace
-- falta tocar RLS para esta columna nueva.
-- ============================================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

COMMENT ON COLUMN public.stores.whatsapp_number IS
  'Número de WhatsApp (con código de país, sin +) para recibir pedidos de esta Store. NULL = usa NEXT_PUBLIC_WHATSAPP_NUMBER como fallback.';

-- ============================================================================
-- Número de prueba para yo-heladerias (Cliente 2) — actualizar cuando
-- Andrés confirme el número definitivo.
-- ============================================================================
UPDATE public.stores SET whatsapp_number = '5493816713512' WHERE slug = 'yo-heladerias';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT slug, name, whatsapp_number FROM public.stores ORDER BY id;
