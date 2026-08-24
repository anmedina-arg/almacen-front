-- ============================================================================
-- Tabla: clients
-- Dominio: Clients (#88, spec #81, mapa #74; scoping por Store: #19).
-- ============================================================================
-- Identifica clientes por lote (barrio + manzana_lote) o como "otros" con
-- una descripción libre (portero, vecino, etc.). Verificado contra
-- producción el 2026-08-22. Fuentes: supabase_clients.sql (creación,
-- incluye también el client_id FK que fue agregado a orders — ya extraído
-- por Orders #84) + supabase_clients_otros_description.sql (permite
-- múltiples "otros" diferenciados por descripción) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_orders.sql (#16 — scopeó los dos índices únicos
-- por Store, a pesar de vivir en un archivo nombrado "orders"; encontrado
-- en #84 al leer ese archivo completo) +
-- supabase_fix_super_admin_remaining_policies.sql (2026-08-19 — policy
-- actualizada para reconocer super_admin además de admin; encontrado en
-- #87 al verificar contra producción, este dominio es el último en
-- confirmar su parte de ese archivo — ver Gaps conocidos).
--
-- LÓGICA DE "OTROS": barrio = 'otros' permite manzana_lote como nota libre
-- de texto (ej: "portero", "vino un albañil") en vez de lote estructurado.
-- clients_unique_lot excluye 'otros' a propósito (WHERE barrio != 'otros')
-- — un "otros" con nota puede repetirse sin conflicto, solo se exige que
-- haya un único "otros" SIN nota (el catch-all real,
-- clients_unique_otros_sin_desc). El comentario original de
-- supabase_clients_otros_description.sql decía que los "otros" con
-- descripción quedaban cubiertos por el índice de (barrio, manzana_lote)
-- — impreciso, ese índice los excluye explícitamente; el comportamiento
-- real (sin unicidad entre "otros" con descripción) es intencional, no un
-- bug, confirmado en #84/supabase_store_scoping_orders.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id           SERIAL PRIMARY KEY,
  barrio       TEXT NOT NULL CHECK (barrio IN ('AC1', 'AC2', 'otros')),
  manzana_lote TEXT,
  display_code TEXT GENERATED ALWAYS AS (
    CASE WHEN barrio = 'otros' THEN 'otros' ELSE barrio || '-' || manzana_lote END
  ) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id     INTEGER NOT NULL REFERENCES public.stores(id),

  -- manzana_lote requerido y con formato letra + 2 dígitos (01-30) cuando
  -- barrio != 'otros'; libre (cualquier texto, o NULL) cuando es 'otros'.
  CONSTRAINT manzana_lote_required CHECK (
    barrio = 'otros'
    OR (manzana_lote IS NOT NULL AND manzana_lote ~ '^[A-Z](0[1-9]|[12][0-9]|30)$')
  )
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS clients_unique_lot
  ON public.clients (store_id, barrio, manzana_lote)
  WHERE barrio != 'otros';

CREATE UNIQUE INDEX IF NOT EXISTS clients_unique_otros_sin_desc
  ON public.clients (store_id, barrio)
  WHERE barrio = 'otros' AND manzana_lote IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_store_id ON public.clients(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Scoped por Store desde #19 — reemplaza el chequeo de rol global
-- (admin/super_admin) por membership vía is_store_admin(). La policy vieja
-- no tenía WITH CHECK (ninguna validación en INSERT/UPDATE de qué store_id
-- se guardaba) — se agrega acá, mismo patrón que combo_components.sql.
-- Aplicada y confirmada en producción el 2026-08-25 (el commit que
-- introdujo esto había quedado "pendiente aplicar en producción" al
-- momento de commitear — se aplicó y verificó inmediatamente después, este
-- comentario deja la confirmación donde importa en vez de solo en el
-- historial de git).
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL
  USING (public.is_store_admin(clients.store_id))
  WITH CHECK (public.is_store_admin(clients.store_id));

-- El puente permisivo (is_store_admin(NULL) = true) que aplicaba acá se
-- cerró en #22 — is_store_admin() ya no tiene esa rama, y store_id es
-- NOT NULL en esta tabla. Ver ADR-0008 (marcado cerrado).

-- No hay policy pública de lectura — a pesar de que el comentario original
-- de supabase_clients.sql decía "anyone can read display_code", esa policy
-- nunca se creó (verificado: una sola policy FOR ALL existe en
-- producción/test). Cualquier lectura pública de display_code hoy pasa por
-- server-side con service role, no por RLS anónima.
