import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el fix de #100: la policy de lectura de product_price_history
// solo chequeaba profiles.role IN admin/super_admin (rol global), sin
// consultar store_admins ni scopear por store_id pese a tener la columna
// con FK e índice propios — mismo patrón de bug que motivó #43, ahora
// reescrita contra is_store_admin(store_id) (products/is_store_admin.sql).
//
// Misma técnica que store-scoping-products.test.ts: sesión de Postgres
// autenticada de verdad (no service_role, que bypassea RLS) para probar
// que la policy en sí aísla — no solo la lógica de aplicación.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  productId: number;
  client: SupabaseClient;
};

describe('store scoping — product_price_history (#100)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeA: StoreFixture;
  let storeB: StoreFixture;
  let superAdminUserId: string;
  let superAdminClient: SupabaseClient;

  async function createStoreFixture(slug: string): Promise<StoreFixture> {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    const email = `__test_price_history_scoping_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    // handle_new_user() no está replicado en el schema public restaurado de
    // test (ver store-scoping-products.test.ts) — se inserta el profile a mano.
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    // log_price_change() (AFTER INSERT ON products) crea la fila de
    // product_price_history sola, con store_id ya seteado (#46).
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: `${slug}-producto`, price: 100, cost: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return { storeId, userId, productId: product!.id, client };
  }

  async function deleteStoreFixture(fixture: StoreFixture) {
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('id', fixture.productId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createStoreFixture(`test-pph-a-${randomUUID().slice(0, 8)}`);
    storeB = await createStoreFixture(`test-pph-b-${randomUUID().slice(0, 8)}`);

    const email = `__test_price_history_super_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    superAdminUserId = authData!.user!.id;

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: superAdminUserId, email, role: 'super_admin' });
    expect(profileError).toBeNull();

    superAdminClient = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await superAdminClient.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteStoreFixture(storeA);
    await deleteStoreFixture(storeB);
    await admin.from('profiles').delete().eq('id', superAdminUserId);
    await admin.auth.admin.deleteUser(superAdminUserId);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A ve el historial de precio de su propia tienda', async () => {
    const { data, error } = await storeA.client
      .from('product_price_history')
      .select('id, store_id')
      .eq('product_id', storeA.productId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.store_id).toBe(storeA.storeId);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO ve el historial de precio de la Store B', async () => {
    const { data, error } = await storeA.client
      .from('product_price_history')
      .select('id')
      .eq('product_id', storeB.productId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.skipIf(!hasCredentials)('el Platform admin (super_admin) ve el historial de precio de cualquier Store', async () => {
    const { data: dataA, error: errorA } = await superAdminClient
      .from('product_price_history')
      .select('id')
      .eq('product_id', storeA.productId);
    expect(errorA).toBeNull();
    expect(dataA).toHaveLength(1);

    const { data: dataB, error: errorB } = await superAdminClient
      .from('product_price_history')
      .select('id')
      .eq('product_id', storeB.productId);
    expect(errorB).toBeNull();
    expect(dataB).toHaveLength(1);
  });
});
