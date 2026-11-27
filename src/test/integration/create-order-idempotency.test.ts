import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOrder } from '@/features/orders/services/orderService';

// #193: pedidos duplicados desde el catálogo público. Un mismo intento de
// envío puede llegar dos veces (doble envío en el cliente o reintento
// automático del navegador). Con p_idempotency_key, create_order() no crea un
// segundo pedido en la misma Store: devuelve el ya creado, sin tocar stock.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey && anonKey);

describe('create_order — idempotencia por clave de envío (#193)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  // El checkout público llama la RPC con la anon key, sin sesión.
  const anon = createClient(url ?? '', anonKey ?? '');

  const storeIds: number[] = [];
  const productIds: number[] = [];
  const orderIds: number[] = [];
  let storeA: number;
  let storeB: number;
  let productA: number;
  let productB: number;
  let userId: string;

  async function createStore(): Promise<number> {
    const slug = `test-idem-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { stock: true } })
      .select('id')
      .single();
    expect(error).toBeNull();
    storeIds.push(data!.id);
    return data!.id;
  }

  async function createProduct(storeId: number, stock: number): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `p-${randomUUID().slice(0, 8)}`, price: 100, image: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: data!.id, quantity: stock, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();
    return data!.id;
  }

  async function stockOf(productId: number): Promise<number> {
    const { data } = await admin.from('product_stock').select('quantity').eq('product_id', productId).single();
    return Number(data!.quantity);
  }

  async function ordersWithKey(storeId: number, key: string): Promise<number[]> {
    const { data, error } = await admin.from('orders').select('id').eq('store_id', storeId).eq('idempotency_key', key);
    expect(error).toBeNull();
    return (data ?? []).map((row) => row.id as number);
  }

  function rpc(storeId: number, productId: number, quantity: number, key: string | null, client = admin) {
    const params: Record<string, unknown> = {
      p_user_id: null,
      p_notes: null,
      p_whatsapp_message: 'pedido de prueba #193',
      p_items: [{ product_id: productId, product_name: 'x', quantity, unit_price: 100, is_by_weight: false }],
      p_store_id: storeId,
    };
    if (key !== null) params.p_idempotency_key = key;
    return client.rpc('create_order', params);
  }

  async function createOk(storeId: number, productId: number, quantity: number, key: string | null, client = admin) {
    const { data, error } = await rpc(storeId, productId, quantity, key, client);
    expect(error).toBeNull();
    orderIds.push(data.order_id);
    return data as { order_id: number; total: number; status: string; items_count: number; deduplicated?: boolean };
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    const email = `__test_idem_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    storeA = await createStore();
    storeB = await createStore();
    for (const storeId of [storeA, storeB]) {
      const { error } = await admin.from('store_admins').insert({ profile_id: userId, store_id: storeId });
      expect(error).toBeNull();
    }
    productA = await createProduct(storeA, 10);
    productB = await createProduct(storeB, 10);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    if (orderIds.length) {
      await admin.from('order_items').delete().in('order_id', orderIds);
      await admin.from('orders').delete().in('id', orderIds);
    }
    await admin.from('product_price_history').delete().in('product_id', productIds);
    await admin.from('stock_movement_log').delete().in('product_id', productIds);
    await admin.from('product_stock').delete().in('product_id', productIds);
    await admin.from('products').delete().in('id', productIds);
    await admin.from('store_admins').delete().eq('profile_id', userId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().in('id', storeIds);
  });

  it.skipIf(!hasCredentials)('la misma clave dos veces crea un solo pedido, devuelve el mismo y descuenta el stock una vez', async () => {
    const key = randomUUID();
    const first = await createOk(storeA, productA, 2, key);
    const second = await createOk(storeA, productA, 2, key);

    expect(first.deduplicated).toBeUndefined();
    expect(second.deduplicated).toBe(true);
    expect(second.order_id).toBe(first.order_id);
    expect(second.total).toBe(first.total);
    expect(second.status).toBe('pending');
    expect(second.items_count).toBe(1);

    expect(await ordersWithKey(storeA, key)).toEqual([first.order_id]);
    const { data: items } = await admin.from('order_items').select('id').eq('order_id', first.order_id);
    expect(items).toHaveLength(1);
    expect(await stockOf(productA)).toBe(8);
  });

  it.skipIf(!hasCredentials)('dos llamadas simultáneas con la misma clave crean un solo pedido', async () => {
    const key = randomUUID();
    const before = await stockOf(productA);
    const results = await Promise.all([
      createOk(storeA, productA, 1, key),
      createOk(storeA, productA, 1, key),
      createOk(storeA, productA, 1, key),
    ]);

    expect(new Set(results.map((r) => r.order_id)).size).toBe(1);
    expect(results.filter((r) => r.deduplicated === true)).toHaveLength(2);
    expect(await ordersWithKey(storeA, key)).toHaveLength(1);
    expect(await stockOf(productA)).toBe(before - 1);
  });

  it.skipIf(!hasCredentials)('sin clave dos pedidos iguales siguen siendo dos pedidos (comportamiento anterior)', async () => {
    const before = await stockOf(productA);
    const first = await createOk(storeA, productA, 1, null);
    const second = await createOk(storeA, productA, 1, null);

    expect(second.order_id).not.toBe(first.order_id);
    expect(second.deduplicated).toBeUndefined();
    expect(await stockOf(productA)).toBe(before - 2);
  });

  it.skipIf(!hasCredentials)('la misma clave en Stores distintas crea un pedido en cada una', async () => {
    const key = randomUUID();
    const inA = await createOk(storeA, productA, 1, key);
    const inB = await createOk(storeB, productB, 1, key);

    expect(inB.order_id).not.toBe(inA.order_id);
    expect(inB.deduplicated).toBeUndefined();
    expect(await ordersWithKey(storeA, key)).toEqual([inA.order_id]);
    expect(await ordersWithKey(storeB, key)).toEqual([inB.order_id]);
  });

  it.skipIf(!hasCredentials)('claves distintas crean pedidos distintos', async () => {
    const first = await createOk(storeA, productA, 1, randomUUID());
    const second = await createOk(storeA, productA, 1, randomUUID());
    expect(second.order_id).not.toBe(first.order_id);
  });

  it.skipIf(!hasCredentials)('el checkout público (anon, sin sesión) también deduplica', async () => {
    const key = randomUUID();
    const first = await createOk(storeA, productA, 1, key, anon);
    const second = await createOk(storeA, productA, 1, key, anon);
    expect(second.order_id).toBe(first.order_id);
    expect(second.deduplicated).toBe(true);
  });

  it.skipIf(!hasCredentials)('createOrder() del servicio reenvía la clave y no repite el paso de Variedades', async () => {
    const key = randomUUID();
    const input = {
      whatsapp_message: 'pedido de prueba #193',
      idempotency_key: key,
      items: [{ product_id: productA, product_name: 'x', quantity: 1, unit_price: 100, is_by_weight: false, from_suggestion: false }],
    };
    const first = await createOrder(admin, storeA, input);
    orderIds.push(first.order_id);
    const second = await createOrder(admin, storeA, input);

    expect(second.order_id).toBe(first.order_id);
    expect(second.deduplicated).toBe(true);
    expect(await ordersWithKey(storeA, key)).toHaveLength(1);
  });

  it.skipIf(!hasCredentials)('createOrder() sin clave se comporta como antes', async () => {
    const input = {
      whatsapp_message: 'pedido de prueba #193',
      items: [{ product_id: productA, product_name: 'x', quantity: 1, unit_price: 100, is_by_weight: false, from_suggestion: false }],
    };
    const first = await createOrder(admin, storeA, input);
    const second = await createOrder(admin, storeA, input);
    orderIds.push(first.order_id, second.order_id);
    expect(second.order_id).not.toBe(first.order_id);
  });
});
