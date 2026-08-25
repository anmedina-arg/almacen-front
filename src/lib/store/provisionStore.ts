import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveFeatureFlags, type FeatureFlags } from './featureFlags';

export type ProvisionStoreParams = {
  slug: string;
  name: string;
  ownerEmail: string;
  /**
   * Email de quien corre la herramienta — se verifica contra profiles.role
   * (#13) antes de hacer nada más. El service_role key ya es de por sí un
   * límite de acceso fuerte (solo vive en .env.local/.env.test), pero #26
   * pide explícitamente "solo accesible a super_admin" como AC verificable,
   * y #13 (bloqueante de este ticket) ya deja la maquinaria de profiles.role
   * lista para eso — no tiene sentido no reusarla acá.
   */
  operatorEmail: string;
  whatsappNumber?: string | null;
  featureFlags?: Partial<FeatureFlags>;
};

export type ProvisionStoreResult = {
  storeId: number;
  slug: string;
  ownerProfileId: string;
  ownerInvited: boolean;
  featureFlags: FeatureFlags;
  whatsappNumber: string | null;
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(['api', 'robots.txt', 'sitemap.xml']);

function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Slug inválido: "${slug}" — solo minúsculas, números y guiones (ej. "nueva-store")`);
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`Slug reservado por el sitio: "${slug}" (ver SITE_LEVEL_ROUTES en src/middleware.ts)`);
  }
}

async function findProfileIdByEmail(supabaseAdmin: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
  return data?.id ?? null;
}

async function assertOperatorIsSuperAdmin(supabaseAdmin: SupabaseClient, operatorEmail: string): Promise<void> {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('email', operatorEmail).maybeSingle();
  if (data?.role !== 'super_admin') {
    throw new Error(`"${operatorEmail}" no es super_admin — esta herramienta es solo para el Platform admin.`);
  }
}

/**
 * Invita al dueño por email vía Supabase Auth Admin API y crea su profile a
 * mano. No depende del trigger on_auth_user_created: ese trigger no existe
 * en el proyecto de test (ver supabase/schema/store/README.md, "Gaps
 * conocidos"), así que hacer el upsert acá deja este flujo funcionando
 * igual en ambos ambientes en vez de confiar en un side-effect que en
 * producción sí dispara pero en test no.
 */
async function inviteOwner(supabaseAdmin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) {
    throw new Error(`No se pudo invitar al dueño (${email}): ${error?.message ?? 'sin usuario devuelto'}`);
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: data.user.id, email, role: 'user' }, { onConflict: 'id' });
  if (profileError) {
    throw new Error(`Usuario invitado pero falló la creación del profile: ${profileError.message}`);
  }

  return data.user.id;
}

/**
 * Alta de una Store nueva de punta a punta (#26, ADR-0006): stores +
 * membership del dueño en store_admins + feature_flags inicial +
 * whatsapp_number inicial, sin SQL a mano. Requiere un client construido
 * con el service_role key — bypassea RLS a propósito (stores/store_admins
 * no tienen policies de INSERT, ver provision_store.sql).
 *
 * "Solo accesible a super_admin" (#26 AC) se verifica de verdad acá contra
 * profiles.role, no solo por posesión del service_role key — ver
 * assertOperatorIsSuperAdmin.
 */
export async function provisionStore(
  supabaseAdmin: SupabaseClient,
  params: ProvisionStoreParams
): Promise<ProvisionStoreResult> {
  const { slug, name, ownerEmail, operatorEmail, whatsappNumber = null } = params;
  assertValidSlug(slug);
  await assertOperatorIsSuperAdmin(supabaseAdmin, operatorEmail);
  const featureFlags = resolveFeatureFlags(params.featureFlags ?? {});

  const { data: existingStore } = await supabaseAdmin
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existingStore) {
    throw new Error(`Ya existe una Store con el slug "${slug}"`);
  }

  let ownerProfileId = await findProfileIdByEmail(supabaseAdmin, ownerEmail);
  const ownerInvited = ownerProfileId == null;
  if (ownerProfileId == null) {
    ownerProfileId = await inviteOwner(supabaseAdmin, ownerEmail);
  }

  const { data, error } = await supabaseAdmin.rpc('provision_store', {
    p_slug: slug,
    p_name: name,
    p_owner_profile_id: ownerProfileId,
    p_whatsapp_number: whatsappNumber,
    p_feature_flags: featureFlags,
  });
  if (error || !data) {
    throw new Error(`provision_store RPC falló: ${error?.message ?? 'sin resultado'}`);
  }

  return {
    storeId: data.store_id,
    slug: data.slug,
    ownerProfileId,
    ownerInvited,
    featureFlags,
    whatsappNumber,
  };
}
