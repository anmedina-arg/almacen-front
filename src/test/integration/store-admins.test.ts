import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Verifica supabase/supabase_store_admins.sql (ticket #13) contra el proyecto
// de test: la tabla `store_admins` existe, `profiles.role` acepta
// 'super_admin', y el admin actual (Andrés) quedó migrado con super_admin
// + membership en market-del-cevil.
//
// Usa service_role (no anon key): store_admins solo permite SELECT de la
// propia membership o a super_admin vía RLS — con anon key un select
// siempre daría 0 filas, sea cierto o no (falso positivo).
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasServiceRoleCredentials = Boolean(url && serviceRoleKey);

const ADMIN_EMAIL = 'andres.medina.arg@gmail.com';

describe('store_admins + super_admin (#13)', () => {
  const supabase = createClient(url ?? '', serviceRoleKey ?? '');

  it.skipIf(!hasServiceRoleCredentials)('la tabla store_admins existe y es consultable', async () => {
    const { error } = await supabase.from('store_admins').select('id').limit(1);
    expect(error).toBeNull();
  });

  it.skipIf(!hasServiceRoleCredentials)('store_admins tiene las columnas esperadas', async () => {
    const { error } = await supabase
      .from('store_admins')
      .select('id, profile_id, store_id, role, created_at')
      .limit(1);
    expect(error).toBeNull();
  });

  it.skipIf(!hasServiceRoleCredentials)('profiles.role acepta super_admin', async () => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle();

    expect(profileError).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile?.role).toBe('super_admin');
  });

  it.skipIf(!hasServiceRoleCredentials)('el admin actual tiene membership en market-del-cevil', async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle();

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', 'market-del-cevil')
      .maybeSingle();

    expect(profile).not.toBeNull();
    expect(store).not.toBeNull();

    const { data: membership, error } = await supabase
      .from('store_admins')
      .select('id, role')
      .eq('profile_id', profile?.id)
      .eq('store_id', store?.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('admin');
  });
});
