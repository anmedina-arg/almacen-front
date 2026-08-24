import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de get_top_products/get_top_categories
// (ticket #20): el admin de una Store nunca recibe datos de otra, ni por
// API (p_store_id agregado a las rutas) ni llamando el RPC directo.
//
// A diferencia de las tablas (products, orders, clients, ...), estas
// funciones no tienen RLS propia — son SECURITY DEFINER, bypassean RLS por
// diseño. El aislamiento acá viene de dos capas distintas, ambas
// verificadas por separado: (1) autorización — is_store_admin(p_store_id)
// rechaza con RAISE EXCEPTION si el caller no es admin de esa Store
// (probado con la Store ajena); (2) filtro de datos — WHERE o.store_id =
// p_store_id (probado con la propia Store, confirmando que no aparecen
// productos de la otra aunque la autorización pase).
//
// Mismo patrón que store-scoping-orders.test.ts para sembrar un pedido
// real vía create_order() (RPC SECURITY DEFINER).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  productId: number;
  productName: string;
  categoryId: number;
  categoryName: string;
  orderId: number;
  client: SupabaseClient;
};

describe('store scoping — ranking: get_top_products / get_top_categories (#20)', () => {
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

    const email = `__test_scoping_ranking_${randomUUID()}@example.invalid`;
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

    const productName = `${slug}-producto`;
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        name: productName,
        price: 100,
        image: '',
        categories: '',
        store_id: storeId,
        active: true,
        category_id: category!.id,
      })
      .select('id')
      .single();
    expect(productError).toBeNull();
    await admin.from('product_price_history').delete().eq('product_id', product!.id);

    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: product!.id, quantity: 100, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();
    await admin.from('stock_movement_log').delete().eq('product_id', product!.id);

    const { data: orderResult, error: orderError } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: `pedido de prueba ${slug}`,
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: product!.id,
          product_name: productName,
          quantity: 1,
          unit_price: 100,
          unit_cost: 50,
          is_by_weight: false,
        },
      ],
      p_store_id: storeId,
    });
    expect(orderError).toBeNull();
    const orderId = orderResult.order_id;
    await admin.from('stock_movement_log').delete().eq('product_id', product!.id);

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return {
      storeId,
      userId,
      productId: product!.id,
      productName,
      categoryId: category!.id,
      categoryName,
      orderId,
      client,
    };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('order_items').delete().eq('order_id', fixture.orderId);
    await admin.from('orders').delete().eq('id', fixture.orderId);
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('product_stock').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('categories').delete().eq('store_id', fixture.storeId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-ranking-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-ranking-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('get_top_products: el admin de la Store A ve su propio producto vendido', async () => {
    const { data, error } = await storeA.client.rpc('get_top_products', {
      p_store_id: storeA.storeId,
    });

    expect(error).toBeNull();
    const names = (data ?? []).map((row: { product_name: string }) => row.product_name);
    expect(names).toContain(storeA.productName);
    expect(names).not.toContain(storeB.productName);
  });

  it.skipIf(!hasCredentials)('get_top_products: el admin de la Store A NO puede pedir el ranking de la Store B', async () => {
    const { data, error } = await storeA.client.rpc('get_top_products', {
      p_store_id: storeB.storeId,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toContain('Forbidden');
  });

  it.skipIf(!hasCredentials)('get_top_categories: el admin de la Store A ve su propia categoría facturada', async () => {
    const { data, error } = await storeA.client.rpc('get_top_categories', {
      p_store_id: storeA.storeId,
    });

    expect(error).toBeNull();
    const names = (data ?? []).map((row: { category_name: string }) => row.category_name);
    expect(names).toContain(storeA.categoryName);
    expect(names).not.toContain(storeB.categoryName);
  });

  it.skipIf(!hasCredentials)('get_top_categories: el admin de la Store A NO puede pedir el ranking de la Store B', async () => {
    const { data, error } = await storeA.client.rpc('get_top_categories', {
      p_store_id: storeB.storeId,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toContain('Forbidden');
  });
});
