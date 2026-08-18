-- ============================================================================
-- Lectura pública de stores
-- Ticket: #12 (https://github.com/anmedina-arg/almacen-front/issues/12)
-- ============================================================================
-- En #10, `stores` quedó con RLS habilitada SIN ninguna policy (default-deny
-- total para anon/authenticated) — a propósito, señalado en el header de
-- supabase_multitenant_schema_expand.sql como deferido a este ticket (#12,
-- resolución por slug) y a #13 (store_admins/super_admin, para escritura).
--
-- El middleware y el layout de src/app/[store]/ necesitan poder resolver el
-- slug de la URL contra la tabla stores sin sesión admin (cualquier visitante
-- público navegando el catálogo). Solo se agrega SELECT — la escritura sigue
-- cerrada hasta que #13 defina quién puede dar de alta/editar Stores.
--
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read stores" ON public.stores;
CREATE POLICY "Anyone can read stores"
  ON public.stores FOR SELECT USING (true);


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'stores';
