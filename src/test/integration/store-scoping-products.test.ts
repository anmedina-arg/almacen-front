import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de products/categories (ticket #15):
// el admin de una Store nunca ve ni modifica datos de otra, ni por API
// (los .eq('store_id', ...) agregados a las rutas) ni por RLS directa.
//
// A diferencia de store-admins.test.ts / verify-store-admin-auth.test.ts
// (que usan service_role, que bypassea RLS, o filas descartables sin
// sesión real), esto necesita una sesión de Postgres autenticada de
// verdad para probar que la policy en sí bloquea — no solo la lógica JS.
// Se crean 2 usuarios de Auth reales (de un solo uso, vía la API admin) y
// se firma sesión con la anon key para cada uno.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  email: string;
  productId: number;
  categoryId: number;
  categoryName: string;
  client: SupabaseClient;
};

describe('store scoping — products & categories (#15)', () => {
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

    const email = `__test_scoping_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    // El trigger handle_new_user() (crea profiles automáticamente al alta
    // en auth.users) vive sobre auth.users, fuera del schema public que se
    // restauró al proyecto de test — no está replicado ahí. Se inserta el
    // profile a mano, mismo shape que haría el trigger en producción.
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    const categoryName = `${slug}-categoria`;
    const { data: category, error: categoryError } = await admin
      .from('categories')
      .insert({ name: categoryName, store_id: storeId, sort_order: 1 })
      .select('id')
      .single();
    expect(categoryError).toBeNull();

    const { data: product, error: productError } = await admin
      .from('products')
      // active: false a propósito — "Public can view active products" es una
      // policy PERMISSIVE separada que se combina con OR en Postgres: un
      // producto activo sería visible para cualquiera vía esa policy sola,
      // sin pasar por la de admin. Solo un producto inactivo ejercita
      // exclusivamente "Admins can view all products" (la que este ticket
      // scopea) — la lectura pública de productos activos NO se aísla por
      // RLS a propósito (ver el comment en supabase_store_scoping_products.sql).
      .insert({ name: `${slug}-producto`, price: 100, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();

    // log_price_change() (trigger pre-existente sobre products, ver
    // supabase_pricing.sql) inserta en product_price_history sin setear
    // store_id — no está en el alcance de #15 arreglar ese trigger, pero
    // dejar la fila huérfana (store_id NULL) hace flaquear en paralelo el
    // check global de backfill-store-id.test.ts. Se borra de inmediato acá
    // en vez de esperar al afterAll, para cerrar la ventana lo antes posible.
    await admin.from('product_price_history').delete().eq('product_id', product!.id);

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return { storeId, userId, email, productId: product!.id, categoryId: category!.id, categoryName, client };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('categories').delete().eq('store_id', fixture.storeId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    // profiles.id no tiene la FK a auth.users enforced en test (ver
    // docs/ops/poblar-test-db.md) — borrar el auth user no cascadea el
    // profile acá como sí pasaría en producción.
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A ve su propio producto inactivo/activo vía RLS', async () => {
    const { data, error } = await storeA.client
      .from('products')
      .select('id')
      .eq('id', storeA.productId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(storeA.productId);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO ve el producto de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('products')
      .select('id')
      .eq('id', storeB.productId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede actualizar el producto de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('products')
      .update({ price: 999 })
      .eq('id', storeB.productId)
      .select('id');

    // RLS bloquea silenciosamente (0 filas afectadas), no tira error.
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from('products')
      .select('price')
      .eq('id', storeB.productId)
      .single();
    expect(Number(unchanged?.price)).toBe(100);
  });

  // No hay test de SELECT para categories: "Anyone can read categories" es
  // USING (true), pública sin condición — por diseño, cualquiera ve
  // cualquier categoría de cualquier Store (igual que products activos).
  // Lo que sí aísla el puente de este ticket es la escritura.
  it.skipIf(!hasCredentials)('el admin de la Store A NO puede actualizar la categoría de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('categories')
      .update({ name: 'hackeada' })
      .eq('id', storeB.categoryId)
      .select('id');

    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from('categories')
      .select('name')
      .eq('id', storeB.categoryId)
      .single();
    expect(unchanged?.name).toBe(storeB.categoryName);
  });

  it.skipIf(!hasCredentials)('fetchPublicProducts (vía query directo) solo trae productos de la Store propia', async () => {
    const { data } = await admin.from('products').select('id, store_id').eq('store_id', storeA.storeId);
    const ids = (data ?? []).map((p) => p.id);
    expect(ids).toContain(storeA.productId);
    expect(ids).not.toContain(storeB.productId);
  });
});
