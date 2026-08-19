import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de orders/order_items/order_payments
// (ticket #16): el admin de una Store nunca ve ni modifica pedidos de otra,
// ni por API ni por RLS directa. También confirma que create_order() (RPC
// SECURITY DEFINER) etiqueta store_id correctamente.
//
// Mismo patrón que store-scoping-products.test.ts: usuarios de Auth reales
// (de un solo uso, vía la API admin) + sesión firmada con la anon key, para
// probar la policy en sí — no solo la lógica JS.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  productId: number;
  orderId: number;
  client: SupabaseClient;
};

describe('store scoping — orders & order_items & order_payments (#16)', () => {
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

    const email = `__test_scoping_orders_${randomUUID()}@example.invalid`;
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

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: `${slug}-producto`, price: 100, image: '', categories: '', store_id: storeId, active: true })
      .select('id')
      .single();
    expect(productError).toBeNull();
    await admin.from('product_price_history').delete().eq('product_id', product!.id);

    // updated_by alimenta stock_movement_log.performed_by (NOT NULL, ver
    // trigger log_initial_stock en supabase_stock_control.sql) — no viene
    // de auth.uid(), así que hace falta un profile_id real acá.
    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: product!.id, quantity: 100, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();

    // log_initial_stock/log_stock_change tampoco setean store_id en
    // stock_movement_log (mismo gap que product_price_history, #46) — se
    // borra de inmediato para no flaquear en paralelo el check global de
    // backfill-store-id.test.ts, aunque igual cascadearía al borrar el
    // producto en el afterAll.
    await admin.from('stock_movement_log').delete().eq('product_id', product!.id);

    // create_order es SECURITY DEFINER, callable por anon/authenticated —
    // se llama tal cual la ruta lo haría, con el storeId ya resuelto.
    const { data: orderResult, error: orderError } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: `pedido de prueba ${slug}`,
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: product!.id,
          product_name: `${slug}-producto`,
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

    // create_order también descuenta product_stock (movement_type 'sale'),
    // mismo trigger sin store_id — mismo motivo de limpieza inmediata.
    await admin.from('stock_movement_log').delete().eq('product_id', product!.id);

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return { storeId, userId, productId: product!.id, orderId, client };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('order_payments').delete().eq('order_id', fixture.orderId);
    await admin.from('order_items').delete().eq('order_id', fixture.orderId);
    await admin.from('orders').delete().eq('id', fixture.orderId);
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('product_stock').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-orders-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-orders-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('create_order() etiqueta store_id en orders y order_items', async () => {
    const { data: order } = await admin.from('orders').select('store_id').eq('id', storeA.orderId).single();
    expect(order?.store_id).toBe(storeA.storeId);

    const { data: items } = await admin.from('order_items').select('store_id').eq('order_id', storeA.orderId);
    expect(items).toHaveLength(1);
    expect(items?.[0]?.store_id).toBe(storeA.storeId);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A ve su propio pedido vía RLS', async () => {
    const { data, error } = await storeA.client
      .from('orders')
      .select('id')
      .eq('id', storeA.orderId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(storeA.orderId);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO ve el pedido de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('orders')
      .select('id')
      .eq('id', storeB.orderId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede actualizar el pedido de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('orders')
      .update({ notes: 'hackeado' })
      .eq('id', storeB.orderId)
      .select('id');

    expect(data).toEqual([]);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO ve order_items de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('order_items')
      .select('id')
      .eq('order_id', storeB.orderId);

    expect(data).toEqual([]);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede insertar order_payments en un pedido de la Store B', async () => {
    const { error } = await storeA.client
      .from('order_payments')
      .insert({ order_id: storeB.orderId, method: 'efectivo', store_id: storeB.storeId });

    // RLS rechaza el INSERT (WITH CHECK is_store_admin falso) — error, no
    // silencio, a diferencia de SELECT/UPDATE que solo devuelven 0 filas.
    expect(error).not.toBeNull();
  });
});
