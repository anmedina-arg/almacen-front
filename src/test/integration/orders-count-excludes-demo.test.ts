import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getOrdersCountByStore } from '@/features/store/services/getOrdersCountByStore';

// Demo Store (#153): la tabla de pedidos por Store de /admin no la cuenta.
// Verificado a través del servicio (que llama a la RPC
// get_orders_count_by_store) con una sesión real de super_admin, porque la
// RPC valida auth.uid() por su cuenta — mismo fixture de usuario que
// contract-store-id-not-null.test.ts.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

describe('getOrdersCountByStore excluye la Demo Store (#153)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let superAdminClient: SupabaseClient;
  let userId: string;
  let demoStoreId: number;
  let demoSlug: string;

  beforeAll(async () => {
    if (!hasCredentials) return;

    const email = `__test_orders_count_demo_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'super_admin' });
    expect(profileError).toBeNull();

    demoSlug = `test-count-demo-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug: demoSlug, name: 'Demo descartable', is_demo: true })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    demoStoreId = store!.id;

    superAdminClient = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await superAdminClient.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('stores').delete().eq('id', demoStoreId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it.skipIf(!hasCredentials)('no devuelve la Demo Store pero sí las Stores reales', async () => {
    const rows = await getOrdersCountByStore(superAdminClient);
    const slugs = rows.map((r) => r.storeSlug);

    expect(slugs).not.toContain(demoSlug);
    expect(slugs).toContain('market-del-cevil');
  });
});
