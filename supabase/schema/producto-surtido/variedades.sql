-- ============================================================================
-- Tabla: variedades
-- Dominio: Producto Surtido (#92, spec #91, mapa #74)
-- ============================================================================
-- Una Variedad es una etiqueta elegible al armar un Producto Surtido (ej.
-- sabor de helado) — sin precio ni stock propio (ADR-0009), pertenece a
-- una única Familia (familia_id es una FK simple, no una tabla puente: la
-- exclusividad "no se comparte entre Familias" es estructural, no un
-- chequeo aparte).
--
-- Deshabilitar una Variedad (active = false) la saca de elección para toda
-- su Familia — no hace falta ningún mecanismo extra: el pool de Variedades
-- elegibles para un Producto Surtido siempre se lee filtrando
-- WHERE familia_id = ... AND active = true, así que una fila con
-- active = false deja de aparecer para cualquier producto de esa Familia
-- automáticamente (spec #91, user story 4).
--
-- FK compuesta (familia_id, store_id) en vez de una FK simple a familia_id:
-- garantiza que una Variedad no pueda apuntar a una Familia de otra Store
-- a nivel de schema — ver la nota en familias.sql sobre por qué (misma
-- lección de #103).
--
-- ON DELETE CASCADE (#93): borrar una Familia borra sus Variedades, mismo
-- criterio que subcategories.category_id → categories (categories/[id]/route.ts
-- dice explícitamente "Subcategories are deleted via ON DELETE CASCADE").
-- No estaba en la versión original de #92 — encontrado implementando el
-- admin de #93, antes de que nadie llegara a depender del comportamiento
-- viejo (bloquear el DELETE). products.familia_id NO tiene este cascade a
-- propósito: un Producto Surtido que sigue marcado como tal no puede quedar
-- con familia_id NULL (violaría products_surtido_fields_check) — ahí sí
-- tiene que bloquearse el DELETE de la Familia mientras haya productos
-- activos apuntándole.
--
-- Nota operativa: contra una base donde `variedades` ya existe, este
-- `CREATE TABLE IF NOT EXISTS` no aplica el ON DELETE CASCADE por sí solo
-- (es un no-op sobre una tabla existente) — hace falta un ALTER TABLE
-- explícito (DROP CONSTRAINT + ADD CONSTRAINT) corrido una vez contra la
-- base (test y luego producción, paso 5/6 de schema-changes.md). Mismo
-- criterio que el DROP FUNCTION del paso 4: es un paso operativo, no hace
-- falta que quede como sentencia literal acá.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.variedades (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES public.stores(id),
  familia_id INTEGER NOT NULL,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- store_id no entra en el UNIQUE — ya es indirectamente por-Store vía
  -- familia_id, mismo criterio que subcategories.sql (UNIQUE(category_id, name)).
  CONSTRAINT variedades_familia_id_name_key UNIQUE (familia_id, name),
  CONSTRAINT variedades_familia_store_fk
    FOREIGN KEY (familia_id, store_id) REFERENCES public.familias(id, store_id) ON DELETE CASCADE
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_variedades_familia_id ON public.variedades(familia_id);
CREATE INDEX IF NOT EXISTS idx_variedades_store_id ON public.variedades(store_id);

-- ── Trigger ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_variedades_updated_at ON public.variedades;
CREATE TRIGGER trg_variedades_updated_at
  BEFORE UPDATE ON public.variedades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.variedades ENABLE ROW LEVEL SECURITY;

-- Lectura pública sin restricción, incluidas las inactivas — a diferencia
-- de products.sql, que sí separa esto en dos policies de RLS ("Public can
-- view active products" USING active=true vs. "Admins can view all
-- products"). Acá se resuelve con una sola policy sin restricción y el
-- filtrado por "active" queda del lado de la aplicación, porque el admin
-- necesita listar también las deshabilitadas para reactivarlas y el nombre
-- de una Variedad no es dato sensible — no es "el mismo patrón que
-- products", es una decisión distinta con el mismo resultado de fondo
-- (nunca exponer más de lo necesario).
DROP POLICY IF EXISTS "Anyone can read variedades" ON public.variedades;
CREATE POLICY "Anyone can read variedades"
  ON public.variedades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert variedades" ON public.variedades;
CREATE POLICY "Admins can insert variedades"
  ON public.variedades FOR INSERT
  WITH CHECK (public.is_store_admin(variedades.store_id));

DROP POLICY IF EXISTS "Admins can update variedades" ON public.variedades;
CREATE POLICY "Admins can update variedades"
  ON public.variedades FOR UPDATE
  USING (public.is_store_admin(variedades.store_id))
  WITH CHECK (public.is_store_admin(variedades.store_id));

DROP POLICY IF EXISTS "Admins can delete variedades" ON public.variedades;
CREATE POLICY "Admins can delete variedades"
  ON public.variedades FOR DELETE
  USING (public.is_store_admin(variedades.store_id));
