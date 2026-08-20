import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de combo_components (ticket #18): el
// admin de una Store nunca modifica los componentes de un combo de otra,
// ni por RLS directa.
//
// Mismo patrón que store-scoping-products.test.ts / store-scoping-stock.test.ts:
// usuarios de Auth reales (de un solo uso, vía la API admin) + sesión
// firmada con la anon key, para probar la policy en sí — no solo la
// lógica JS. No hay test de SELECT cruzado: "Public can view
// combo_components" (USING true) queda sin tocar a propósito, sostiene el
// catálogo público para visitantes anónimos vía fetchPublicProducts.ts
// (investigado y confirmado durante #17/#18, mismo criterio que "Anyone
// can view stock" y "Anyone can read categories").
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  comboProductId: number;
  componentProductId: number;
  comboComponentId: number;
  client: SupabaseClient;
};

describe('store scoping — combo_components (#18)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeA: StoreFixture;
  let storeB: StoreFixture;

  async function createFixture(slug: string): Promise<StoreFixture> {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    const email = `__test_scoping_combos_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    // handle_new_user() no está replicado en test (ver store-scoping-products.test.ts).
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    const { data: comboProduct, error: comboError } = await admin
      .from('products')
      .insert({ name: `${slug}-combo`, price: 100, image: '', categories: '', store_id: storeId, active: false, is_combo: true })
      .select('id')
      .single();
    expect(comboError).toBeNull();

    const { data: componentProduct, error: componentError } = await admin
      .from('products')
      .insert({ name: `${slug}-componente`, price: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(componentError).toBeNull();

    // log_price_change() (ver store-scoping-products.test.ts) — limpiar de
    // inmediato para no hacer flaquear el check global de backfill-store-id.test.ts.
    await admin.from('product_price_history').delete().in('product_id', [comboProduct!.id, componentProduct!.id]);

    const { data: comboComponent, error: comboComponentError } = await admin
      .from('combo_components')
      .insert({
        combo_product_id: comboProduct!.id,
        component_product_id: componentProduct!.id,
        quantity: 2,
        store_id: storeId,
      })
      .select('id')
      .single();
    expect(comboComponentError).toBeNull();

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return {
      storeId,
      userId,
      comboProductId: comboProduct!.id,
      componentProductId: componentProduct!.id,
      comboComponentId: comboComponent!.id,
      client,
    };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('product_price_history').delete().in('product_id', [fixture.comboProductId, fixture.componentProductId]);
    await admin.from('combo_components').delete().eq('combo_product_id', fixture.comboProductId);
    await admin.from('products').delete().in('id', [fixture.comboProductId, fixture.componentProductId]);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-combos-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-combos-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A puede editar los componentes de su propio combo vía RLS', async () => {
    const { data, error } = await storeA.client
      .from('combo_components')
      .update({ quantity: 5 })
      .eq('id', storeA.comboComponentId)
      .select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede editar los componentes de un combo de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('combo_components')
      .update({ quantity: 999 })
      .eq('id', storeB.comboComponentId)
      .select('id');

    // RLS bloquea silenciosamente (0 filas afectadas), no tira error.
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from('combo_components')
      .select('quantity')
      .eq('id', storeB.comboComponentId)
      .single();
    expect(Number(unchanged?.quantity)).toBe(2);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede insertar un componente en un combo de la Store B vía RLS directa', async () => {
    const { data, error } = await storeA.client
      .from('combo_components')
      .insert({
        combo_product_id: storeB.comboProductId,
        component_product_id: storeA.componentProductId,
        quantity: 1,
        store_id: storeB.storeId,
      })
      .select('id');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede borrar un componente de un combo de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('combo_components')
      .delete()
      .eq('id', storeB.comboComponentId)
      .select('id');

    expect(data).toEqual([]);

    const { data: stillThere } = await admin
      .from('combo_components')
      .select('id')
      .eq('id', storeB.comboComponentId)
      .maybeSingle();
    expect(stillThere?.id).toBe(storeB.comboComponentId);
  });
});
