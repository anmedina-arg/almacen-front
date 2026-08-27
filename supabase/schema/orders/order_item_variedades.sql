-- ============================================================================
-- Tabla: order_item_variedades
-- Dominio: Orders (#95, spec #91, mapa #74)
-- ============================================================================
-- Depende del dominio Familias/Variedades (#92,
-- supabase/schema/producto-surtido/) — registra, por línea de order_items
-- que corresponda a un Producto Surtido, qué Variedades eligió el cliente.
--
-- variedad_name es un snapshot congelado al momento del pedido — mismo
-- patrón que order_items.product_name — así que sobrevive a que la
-- Variedad original se deshabilite o se borre después (spec #91, user
-- story 10). variedad_id es una FK informativa nullable (ON DELETE
-- SET NULL, igual que order_items.product_id): se pierde la referencia
-- viva pero el nombre histórico queda intacto.
--
-- Se llena vía add_order_item_variedades() (ver ese archivo), un paso
-- POSTERIOR a create_order() — a propósito no es create_order() quien
-- escribe acá (#73: esa función ya concentra demasiadas responsabilidades,
-- tocarla causó incidentes reales en producción).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_item_variedades (
  id             BIGSERIAL PRIMARY KEY,
  order_item_id  BIGINT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  variedad_id    INTEGER REFERENCES public.variedades(id) ON DELETE SET NULL,
  variedad_name  TEXT NOT NULL,
  store_id       INTEGER NOT NULL REFERENCES public.stores(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_item_variedades_order_item_id ON public.order_item_variedades(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_variedades_store_id ON public.order_item_variedades(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.order_item_variedades ENABLE ROW LEVEL SECURITY;

-- El INSERT real pasa por add_order_item_variedades() (SECURITY DEFINER) —
-- igual que en order_items, esta policy solo cubre el camino directo si
-- alguna vez se usa (mismo criterio que "Anyone can create order items").
DROP POLICY IF EXISTS "Anyone can create order item variedades" ON public.order_item_variedades;
CREATE POLICY "Anyone can create order item variedades"
  ON public.order_item_variedades FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view order item variedades" ON public.order_item_variedades;
CREATE POLICY "Admins can view order item variedades"
  ON public.order_item_variedades FOR SELECT
  USING (public.is_store_admin(order_item_variedades.store_id));
