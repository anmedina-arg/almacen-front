import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de las 5 funciones SECURITY DEFINER que
// #21 scopea: get_avg_stock_per_product, get_stock_value_per_day (Stock,
// usadas por /admin/dashboard), export_productos, export_ventas y
// refresh_product_affinity (Recomendaciones/Informes, usadas por
// /admin/informes). Mismo patrón de dos capas que store-scoping-ranking.test.ts
// (#20): autorización (is_store_admin(p_store_id) rechaza la Store ajena) +
// filtro de datos (WHERE ... store_id = p_store_id, probado con la propia
// Store).
//
// Las rutas de /admin/dashboard que NO llaman un RPC (pending-payments,
// stock-by-category, stock-products, rotation/snapshots) no tienen un
// objeto propio que testear acá — su aislamiento sale de RLS ya cubierta
// por store-scoping-orders.test.ts/store-scoping-products.test.ts más el
// filtro explícito por store_id en la query (products), documentado inline
// en cada route.ts. POS (/api/pos/orders) reusa create_order(), ya cubierto
// por store-scoping-orders.test.ts.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  categoryId: number;
  categoryName: string;
  productAId: number;
  productAName: string;
  productBId: number;
  orderId: number;
  client: SupabaseClient;
};

describe('store scoping — dashboard & informes: stock/export/afinidad (#21)', () => {
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

    const email = `__test_scoping_dashboard_${randomUUID()}@example.invalid`;
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

    const categoryName = `${slug}-categoria`;
    const { data: category, error: categoryError } = await admin
      .from('categories')
      .insert({ name: categoryName, store_id: storeId, sort_order: 1 })
      .select('id')
      .single();
    expect(categoryError).toBeNull();

    const productAName = `${slug}-producto-a`;
    const { data: productA, error: productAError } = await admin
      .from('products')
      .insert({
        name: productAName,
        price: 100,
        cost: 50,
        image: '',
        categories: '',
        store_id: storeId,
        active: true,
        category_id: category!.id,
      })
      .select('id')
      .single();
    expect(productAError).toBeNull();

    const productBName = `${slug}-producto-b`;
    const { data: productB, error: productBError } = await admin
      .from('products')
      .insert({
        name: productBName,
        price: 50,
        cost: 20,
        image: '',
        categories: '',
        store_id: storeId,
        active: true,
        category_id: category!.id,
      })
      .select('id')
      .single();
    expect(productBError).toBeNull();

    await admin.from('product_price_history').delete().eq('product_id', productA!.id);
    await admin.from('product_price_history').delete().eq('product_id', productB!.id);

    const { error: stockAError } = await admin
      .from('product_stock')
      .insert({ product_id: productA!.id, quantity: 100, store_id: storeId, updated_by: userId });
    expect(stockAError).toBeNull();
    const { error: stockBError } = await admin
      .from('product_stock')
      .insert({ product_id: productB!.id, quantity: 100, store_id: storeId, updated_by: userId });
    expect(stockBError).toBeNull();

    // create_order (RPC SECURITY DEFINER) — ambos productos en el mismo
    // pedido, para que refresh_product_affinity tenga una co-ocurrencia
    // real que puntuar.
    const { data: orderResult, error: orderError } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: `pedido de prueba ${slug}`,
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: productA!.id,
          product_name: productAName,
          quantity: 2,
          unit_price: 100,
          unit_cost: 50,
          is_by_weight: false,
        },
        {
          product_id: productB!.id,
          product_name: productBName,
          quantity: 1,
          unit_price: 50,
          unit_cost: 20,
          is_by_weight: false,
        },
      ],
      p_store_id: storeId,
    });
    expect(orderError).toBeNull();
    const orderId = orderResult.order_id;

    // log_initial_stock/log_stock_change no setean store_id en
    // stock_movement_log (gap #52, ver store-scoping-orders.test.ts) —
    // se limpia para no interferir con otros tests de backfill.
    await admin.from('stock_movement_log').delete().in('product_id', [productA!.id, productB!.id]);

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return {
      storeId,
      userId,
      categoryId: category!.id,
      categoryName,
      productAId: productA!.id,
      productAName,
      productBId: productB!.id,
      orderId,
      client,
    };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('product_affinity').delete().eq('store_id', fixture.storeId);
    await admin.from('order_items').delete().eq('order_id', fixture.orderId);
    await admin.from('orders').delete().eq('id', fixture.orderId);
    await admin.from('product_price_history').delete().in('product_id', [fixture.productAId, fixture.productBId]);
    await admin.from('product_stock').delete().in('product_id', [fixture.productAId, fixture.productBId]);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('categories').delete().eq('store_id', fixture.storeId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-dash-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-dash-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  const today = new Date().toISOString().split('T')[0];

  describe('get_avg_stock_per_product', () => {
    it.skipIf(!hasCredentials)('el admin de la Store A ve el stock promedio de sus propios productos', async () => {
      const { data, error } = await storeA.client.rpc('get_avg_stock_per_product', {
        p_store_id: storeA.storeId,
        p_start_date: today,
        p_end_date: today,
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row: { product_id: number }) => row.product_id);
      expect(ids).toContain(storeA.productAId);
      expect(ids).not.toContain(storeB.productAId);
    });

    it.skipIf(!hasCredentials)('el admin de la Store A NO puede pedir el stock promedio de la Store B', async () => {
      const { data, error } = await storeA.client.rpc('get_avg_stock_per_product', {
        p_store_id: storeB.storeId,
        p_start_date: today,
        p_end_date: today,
      });

      expect(data).toBeNull();
      expect(error?.message).toContain('Forbidden');
    });
  });

  describe('get_stock_value_per_day', () => {
    it.skipIf(!hasCredentials)('el admin de la Store A ve el valor de stock de su propia categoría', async () => {
      const { data, error } = await storeA.client.rpc('get_stock_value_per_day', {
        p_store_id: storeA.storeId,
        p_start_date: today,
        p_end_date: today,
      });

      expect(error).toBeNull();
      const names = (data ?? []).map((row: { category_name: string }) => row.category_name);
      expect(names).toContain(storeA.categoryName);
      expect(names).not.toContain(storeB.categoryName);
    });

    it.skipIf(!hasCredentials)('el admin de la Store A NO puede pedir el valor de stock de la Store B', async () => {
      const { data, error } = await storeA.client.rpc('get_stock_value_per_day', {
        p_store_id: storeB.storeId,
        p_start_date: today,
        p_end_date: today,
      });

      expect(data).toBeNull();
      expect(error?.message).toContain('Forbidden');
    });
  });

  describe('export_productos', () => {
    it.skipIf(!hasCredentials)('el admin de la Store A exporta solo sus propios productos', async () => {
      const { data, error } = await storeA.client.rpc('export_productos', {
        p_store_id: storeA.storeId,
      });

      expect(error).toBeNull();
      const names = (data ?? []).map((row: { nombre: string }) => row.nombre);
      expect(names).toContain(storeA.productAName);
      expect(names).not.toContain(storeB.productAName);
    });

    it.skipIf(!hasCredentials)('el admin de la Store A NO puede exportar productos de la Store B', async () => {
      const { data, error } = await storeA.client.rpc('export_productos', {
        p_store_id: storeB.storeId,
      });

      expect(data).toBeNull();
      expect(error?.message).toContain('Forbidden');
    });
  });

  describe('export_ventas', () => {
    it.skipIf(!hasCredentials)('el admin de la Store A exporta solo sus propias ventas', async () => {
      const { data, error } = await storeA.client.rpc('export_ventas', {
        p_store_id: storeA.storeId,
      });

      expect(error).toBeNull();
      const orderIds = (data ?? []).map((row: { orden_id: number }) => row.orden_id);
      expect(orderIds).toContain(storeA.orderId);
      expect(orderIds).not.toContain(storeB.orderId);
    });

    it.skipIf(!hasCredentials)('el admin de la Store A NO puede exportar ventas de la Store B', async () => {
      const { data, error } = await storeA.client.rpc('export_ventas', {
        p_store_id: storeB.storeId,
      });

      expect(data).toBeNull();
      expect(error?.message).toContain('Forbidden');
    });
  });

  describe('refresh_product_affinity', () => {
    it.skipIf(!hasCredentials)('el admin de la Store A recalcula afinidad solo con datos de su propia Store', async () => {
      const { error } = await storeA.client.rpc('refresh_product_affinity', {
        p_store_id: storeA.storeId,
      });
      expect(error).toBeNull();

      const { data: rows } = await admin
        .from('product_affinity')
        .select('product_id_a, product_id_b, score, store_id')
        .eq('product_id_a', storeA.productAId)
        .eq('product_id_b', storeA.productBId);

      expect(rows).toHaveLength(1);
      expect(rows?.[0]?.store_id).toBe(storeA.storeId);
      expect(Number(rows?.[0]?.score)).toBeGreaterThan(0);
    });

    it.skipIf(!hasCredentials)('el admin de la Store A NO puede disparar el recálculo de la Store B', async () => {
      const { data, error } = await storeA.client.rpc('refresh_product_affinity', {
        p_store_id: storeB.storeId,
      });

      expect(data).toBeNull();
      expect(error?.message).toContain('Forbidden');
    });
  });

  describe('category_affinity_rules RLS', () => {
    it.skipIf(!hasCredentials)('el admin de la Store A no puede insertar una regla marcada como de la Store B', async () => {
      const { error } = await storeA.client
        .from('category_affinity_rules')
        .insert({
          from_category_id: storeA.categoryId,
          to_category_id: storeB.categoryId,
          boost: 2,
          store_id: storeB.storeId,
        });

      expect(error).not.toBeNull();
    });
  });
});
