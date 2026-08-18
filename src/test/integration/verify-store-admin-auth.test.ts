import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveStoreAdminStatus } from '@/features/auth/utils/roleHelpers';

// Verifica resolveStoreAdminStatus (ticket #14) — el núcleo de
// verifyStoreAdminAuth() sin el wrapper de cookies()/getUser() de Next.js,
// que no se puede invocar fuera de un request real. Integration test contra
// el proyecto de test real, sin mocks — mismo principio que el resto de
// este repo, aunque el patrón de fila descartable + cleanup (afterEach) es
// nuevo acá: los demás integration tests solo leen datos ya sembrados.
//
// Usa service_role para poder sembrar profiles/store_admins descartables
// directamente (bypassea RLS). La FK profiles.id -> auth.users no está
// enforced en test (ver docs/ops/poblar-test-db.md), así que un UUID random
// es un id de profile válido acá.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasServiceRoleCredentials = Boolean(url && serviceRoleKey);

const STORE_SLUG = 'market-del-cevil';

describe('resolveStoreAdminStatus (#14)', () => {
  const supabase = createClient(url ?? '', serviceRoleKey ?? '');
  const cleanupIds: string[] = [];

  afterEach(async () => {
    if (cleanupIds.length === 0) return;
    await supabase.from('profiles').delete().in('id', cleanupIds);
    cleanupIds.length = 0;
  });

  async function createDisposableProfile(role: 'user' | 'admin' | 'super_admin') {
    const id = randomUUID();
    const email = `__test_verify_store_admin_${id}@example.invalid`;
    const { error } = await supabase.from('profiles').insert({ id, email, role });
    expect(error).toBeNull();
    cleanupIds.push(id);
    return id;
  }

  it.skipIf(!hasServiceRoleCredentials)('con membership en store_admins: isStoreAdmin true', async () => {
    const profileId = await createDisposableProfile('user');

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', STORE_SLUG)
      .maybeSingle();
    expect(store).not.toBeNull();

    const { error: membershipError } = await supabase
      .from('store_admins')
      .insert({ profile_id: profileId, store_id: store?.id, role: 'admin' });
    expect(membershipError).toBeNull();

    const result = await resolveStoreAdminStatus(supabase, profileId, STORE_SLUG);

    expect(result.error).toBeNull();
    expect(result.isStoreAdmin).toBe(true);
    expect(result.storeId).toBe(store?.id);
  });

  it.skipIf(!hasServiceRoleCredentials)('sin membership ni super_admin: isStoreAdmin false', async () => {
    const profileId = await createDisposableProfile('user');

    const result = await resolveStoreAdminStatus(supabase, profileId, STORE_SLUG);

    expect(result.isStoreAdmin).toBe(false);
  });

  it.skipIf(!hasServiceRoleCredentials)('super_admin sin membership: isStoreAdmin true', async () => {
    const profileId = await createDisposableProfile('super_admin');

    const result = await resolveStoreAdminStatus(supabase, profileId, STORE_SLUG);

    expect(result.error).toBeNull();
    expect(result.isStoreAdmin).toBe(true);
  });

  it.skipIf(!hasServiceRoleCredentials)('Store inexistente: isStoreAdmin false con error', async () => {
    const profileId = await createDisposableProfile('super_admin');

    const result = await resolveStoreAdminStatus(supabase, profileId, 'slug-que-no-existe');

    expect(result.isStoreAdmin).toBe(false);
    expect(result.storeId).toBeNull();
    expect(result.error).not.toBeNull();
  });
});
