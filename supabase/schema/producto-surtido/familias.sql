-- ============================================================================
-- Tabla: familias
-- Dominio: Producto Surtido (#92, spec #91, mapa #74). Dominio nuevo — no
-- encajaba en Products/Categories ni en Combos, ver ADR-0009.
-- ============================================================================
-- Una Familia agrupa los tamaños/presentaciones de un Producto Surtido que
-- comparten la misma lista de Variedades (ej. "Helado" agrupa "Helado
-- 1/4kg", "Helado 1/2kg", "Helado 1kg" — ver products.sql, columna
-- familia_id). No es una categoría de catálogo: un Producto Surtido se
-- categoriza igual que cualquier producto, sin relación con su Familia
-- (spec #91, user story 7).
--
-- UNIQUE(id, store_id), no solo UNIQUE(id): sostiene la FK compuesta de
-- variedades.sql y de products.sql (familia_id, store_id) — así una
-- Variedad o un Producto Surtido no pueden referenciar una Familia de otra
-- Store, aplicado a nivel de schema en vez de confiar en el código de
-- aplicación (misma lección de #103: create_order() confiaba en que
-- product_id perteneciera a la Store correcta, y no había nada que lo
-- garantizara).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.familias (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES public.stores(id),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT familias_store_id_name_key UNIQUE (store_id, name),
  CONSTRAINT familias_id_store_id_key UNIQUE (id, store_id)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_familias_store_id ON public.familias(store_id);

-- ── Trigger ──────────────────────────────────────────────────────────────
-- update_updated_at_column() es la función genérica de Products (#85),
-- reusada acá sin redefinir — mismo criterio que stores/product_stock.
DROP TRIGGER IF EXISTS trg_familias_updated_at ON public.familias;
CREATE TRIGGER trg_familias_updated_at
  BEFORE UPDATE ON public.familias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;

-- Lectura pública sin restricción — sostiene el catálogo público, mismo
-- criterio que combo_components/categories: el nombre de la Familia no es
-- sensible, y el catálogo necesita poder listar Variedades disponibles sin
-- login.
DROP POLICY IF EXISTS "Anyone can read familias" ON public.familias;
CREATE POLICY "Anyone can read familias"
  ON public.familias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert familias" ON public.familias;
CREATE POLICY "Admins can insert familias"
  ON public.familias FOR INSERT
  WITH CHECK (public.is_store_admin(familias.store_id));

DROP POLICY IF EXISTS "Admins can update familias" ON public.familias;
CREATE POLICY "Admins can update familias"
  ON public.familias FOR UPDATE
  USING (public.is_store_admin(familias.store_id))
  WITH CHECK (public.is_store_admin(familias.store_id));

DROP POLICY IF EXISTS "Admins can delete familias" ON public.familias;
CREATE POLICY "Admins can delete familias"
  ON public.familias FOR DELETE
  USING (public.is_store_admin(familias.store_id));
