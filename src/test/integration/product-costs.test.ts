import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Spec #179, ticket #183: el Costo de un Producto vive en su propia tabla
// (`product_costs`, una fila por producto y Store; sin fila = "sin costo
// registrado"). Desde #189 es la única fuente: la columna vieja `products.cost` y su
// espejo ya no existen.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type Fixture = { storeId: number; userId: string; client: SupabaseClient; productId: number };

describe.skipIf(!hasCredentials)('product_costs — tabla de costos del Producto (#183)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  let storeA: Fixture;
  let storeB: Fixture;

  async function createFixture(slug: string): Promise<Fixture> {
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug: `${slug}-${tag}`, name: slug, feature_flags: { costos: true } })
      .select('id')
      .single();
    expect(error).toBeNull();

    const email = `__test_costs_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: auth, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(authError).toBeNull();
    const userId = auth!.user!.id;
    await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    await admin.from('store_admins').insert({ profile_id: userId, store_id: store!.id, role: 'admin' });
    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: `${slug}-producto`, price: 100, image: '', store_id: store!.id, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();
    return { storeId: store!.id, userId, client, productId: product!.id };
  }

  async function deleteFixture(f: Fixture) {
    const { data: products } = await admin.from('products').select('id').eq('store_id', f.storeId);
    const ids = (products ?? []).map((p) => p.id);
    if (ids.length > 0) {
      await admin.from('combo_components').delete().in('combo_product_id', ids);
      await admin.from('product_costs').delete().in('product_id', ids);
      await admin.from('product_price_history').delete().in('product_id', ids);
    }
    await admin.from('products').delete().eq('store_id', f.storeId);
    await admin.from('store_admins').delete().eq('store_id', f.storeId);
    await admin.from('profiles').delete().eq('id', f.userId);
    await admin.auth.admin.deleteUser(f.userId);
    await admin.from('stores').delete().eq('id', f.storeId);
  }

  beforeAll(async () => {
    storeA = await createFixture('costs-a');
    storeB = await createFixture('costs-b');
  });

  afterAll(async () => {
    for (const f of [storeA, storeB]) if (f) await deleteFixture(f);
  });

  describe('fuente única del costo', () => {
    it('un producto nuevo no tiene costo registrado', async () => {
      const { data } = await admin.from('product_costs').select('cost').eq('product_id', storeA.productId);
      expect(data).toEqual([]);
    });

    it('el admin de la Store registra, cambia y quita el costo de su producto', async () => {
      const set = await storeA.client
        .from('product_costs')
        .upsert({ product_id: storeA.productId, store_id: storeA.storeId, cost: 1500.5 }, { onConflict: 'product_id,store_id' });
      expect(set.error).toBeNull();

      const change = await storeA.client.from('product_costs').update({ cost: 1800 }).eq('product_id', storeA.productId);
      expect(change.error).toBeNull();

      const { data } = await storeA.client.from('product_costs').select('cost').eq('product_id', storeA.productId).single();
      expect(Number(data!.cost)).toBe(1800);

      const remove = await storeA.client.from('product_costs').delete().eq('product_id', storeA.productId);
      expect(remove.error).toBeNull();
    });

    it('un costo en cero registrado a propósito es distinto de no tener costo', async () => {
      await admin.from('product_costs').insert({ product_id: storeA.productId, store_id: storeA.storeId, cost: 0 });
      const { data } = await admin.from('product_costs').select('cost').eq('product_id', storeA.productId);
      expect(data).toHaveLength(1);
      await admin.from('product_costs').delete().eq('product_id', storeA.productId);
    });

    it('cada cambio de costo queda en el historial de precios (product_price_history)', async () => {
      await admin.from('product_costs').upsert({ product_id: storeA.productId, store_id: storeA.storeId, cost: 70 }, { onConflict: 'product_id,store_id' });
      await admin.from('product_costs').update({ cost: 75 }).eq('product_id', storeA.productId);
      const { data } = await admin
        .from('product_price_history')
        .select('cost')
        .eq('product_id', storeA.productId)
        .order('changed_at', { ascending: true });
      const costs = (data ?? []).map((r) => Number(r.cost));
      expect(costs).toContain(70);
      expect(costs).toContain(75);
      await admin.from('product_costs').delete().eq('product_id', storeA.productId);
    });

    it('borrar el producto borra su costo', async () => {
      const { data: p } = await admin
        .from('products')
        .insert({ name: 'efimero', price: 5, image: '', store_id: storeA.storeId })
        .select('id')
        .single();
      await admin.from('product_costs').insert({ product_id: p!.id, store_id: storeA.storeId, cost: 3 });
      await admin.from('product_price_history').delete().eq('product_id', p!.id);
      await admin.from('products').delete().eq('id', p!.id);
      const { data } = await admin.from('product_costs').select('product_id').eq('product_id', p!.id);
      expect(data).toEqual([]);
    });
  });

  describe('integridad', () => {
    it('no admite un costo negativo', async () => {
      const { error } = await admin.from('product_costs').insert({ product_id: storeA.productId, store_id: storeA.storeId, cost: -1 });
      expect(error?.code).toBe('23514');
    });

    it('el costo tiene que ser de la Store dueña del producto', async () => {
      const { error } = await admin.from('product_costs').insert({ product_id: storeA.productId, store_id: storeB.storeId, cost: 5 });
      expect(error?.code).toBe('23503');
    });
  });

  describe('aislamiento entre Stores', () => {
    it('el admin de una Store no ve ni cambia el costo de otra', async () => {
      await admin.from('product_costs').insert({ product_id: storeB.productId, store_id: storeB.storeId, cost: 999 });

      const read = await storeA.client.from('product_costs').select('cost').eq('product_id', storeB.productId);
      expect(read.data).toEqual([]);

      const write = await storeA.client.from('product_costs').update({ cost: 1 }).eq('product_id', storeB.productId).select();
      expect(write.data ?? []).toEqual([]);

      const forge = await storeA.client.from('product_costs').insert({ product_id: storeB.productId, store_id: storeB.storeId, cost: 1 });
      expect(forge.error).not.toBeNull();

      expect(Number((await admin.from('product_costs').select('cost').eq('product_id', storeB.productId).single()).data!.cost)).toBe(999);
      await admin.from('product_costs').delete().eq('product_id', storeB.productId);
    });

    it('un visitante anónimo no puede leer costos', async () => {
      await admin.from('product_costs').insert({ product_id: storeA.productId, store_id: storeA.storeId, cost: 42 });
      const anon = createClient(url ?? '', anonKey ?? '');
      const { data, error } = await anon.from('product_costs').select('cost').eq('product_id', storeA.productId);
      // O no tiene permiso sobre la tabla, o RLS no le devuelve filas: en ningún caso ve el costo.
      expect(error !== null || (data ?? []).length === 0).toBe(true);
      await admin.from('product_costs').delete().eq('product_id', storeA.productId);
    });
  });

  describe('combos: el costo se calcula de sus componentes y queda en la tabla', () => {
    it('el costo del combo es la suma de cantidad × costo de cada componente, y se actualiza con ellos', async () => {
      const mk = async (name: string, isCombo = false) =>
        (await admin.from('products').insert({ name, price: 10, image: '', store_id: storeA.storeId, is_combo: isCombo }).select('id').single()).data!.id as number;
      const compA = await mk('comp-a');
      const compB = await mk('comp-b');
      const combo = await mk('combo', true);
      await admin.from('product_costs').insert([
        { product_id: compA, store_id: storeA.storeId, cost: 10 },
        { product_id: compB, store_id: storeA.storeId, cost: 5 },
      ]);
      const link = await admin.from('combo_components').insert([
        { combo_product_id: combo, component_product_id: compA, quantity: 2, store_id: storeA.storeId },
        { combo_product_id: combo, component_product_id: compB, quantity: 1, store_id: storeA.storeId },
      ]);
      expect(link.error).toBeNull();

      const comboCost = async () =>
        (await admin.from('product_costs').select('cost').eq('product_id', combo)).data!.map((r) => Number(r.cost));
      expect(await comboCost()).toEqual([25]);

      await admin.from('combo_components').delete().eq('combo_product_id', combo);
      expect(await comboCost()).toEqual([]);
    });
  });
});
