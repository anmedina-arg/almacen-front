-- ============================================================================
-- Función RPC: provision_store
-- Dominio: Store/Platform (#87, spec #81, mapa #74)
-- ============================================================================
-- #26 (ADR-0006): inserta stores + store_admins en una sola transacción
-- (atomicidad de la función), evitando una Store huérfana sin admin si el
-- segundo INSERT fallara (ej. profile_id inválido). Mismo patrón que
-- create_order.sql para escrituras multi-tabla.
--
-- Sin SECURITY DEFINER ni GRANT, y desde #154 con REVOKE de anon/PUBLIC: stores/store_admins no tienen policies de
-- INSERT (default-deny, ver ADR-0006/ADR-0005) y esta función está pensada
-- para llamarse únicamente con el service_role key (bypassea RLS por rol de
-- Postgres, no por definer) — ver src/lib/store/provisionStore.ts y
-- scripts/provision-store.ts. Ese key solo vive en .env.local/.env.test,
-- nunca en el bundle del cliente — primera capa de "solo accesible a
-- super_admin". La segunda capa (la que de verdad se testea) es el chequeo
-- contra profiles.role = 'super_admin' en provisionStore.ts, antes de
-- llegar a esta función — ver assertOperatorIsSuperAdmin.
--
-- p_owner_profile_id ya viene resuelto (profile existente o recién invitado
-- vía Supabase Auth Admin API) — esta función no crea perfiles ni usuarios,
-- solo las dos filas de negocio.
--
-- #153: p_is_demo marca la Store como Demo Store desde el alta (default
-- false). Agrega un parámetro con default al final, así una llamada sin él
-- sigue resolviendo — pero si la firma de 5 parámetros quedara viva al
-- lado, PostgREST no podría elegir entre las dos sobrecargas. Paso
-- operativo, una vez por base existente, antes de aplicar este archivo
-- (convención de docs/agents/schema-changes.md: el DROP no va en el canónico):
--   DROP FUNCTION public.provision_store(text, text, uuid, text, jsonb);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_store(
  p_slug TEXT,
  p_name TEXT,
  p_owner_profile_id UUID,
  p_whatsapp_number TEXT DEFAULT NULL,
  p_feature_flags JSONB DEFAULT '{}'::jsonb,
  p_is_demo BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public  -- search_path fijo (advisor function_search_path_mutable, 2026-11-10).
AS $$
DECLARE
  v_store_id INTEGER;
BEGIN
  INSERT INTO public.stores (slug, name, whatsapp_number, feature_flags, is_demo)
  VALUES (p_slug, p_name, p_whatsapp_number, p_feature_flags, COALESCE(p_is_demo, false))
  RETURNING id INTO v_store_id;

  INSERT INTO public.store_admins (profile_id, store_id, role)
  VALUES (p_owner_profile_id, v_store_id, 'admin');

  RETURN jsonb_build_object('store_id', v_store_id, 'slug', p_slug);
END;
$$;

-- #154: sin EXECUTE para anon. En una base nueva ya nace cerrada; este REVOKE
-- alinea las existentes (docs/agents/schema-changes.md, "Permisos de ejecución de funciones").
REVOKE EXECUTE ON FUNCTION public.provision_store(TEXT, TEXT, UUID, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon;
