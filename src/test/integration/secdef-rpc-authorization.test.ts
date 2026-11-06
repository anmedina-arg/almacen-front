import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// #154: auditoría de las funciones SECURITY DEFINER llamables por anon.
// Supabase da EXECUTE a `anon` sobre toda función nueva de `public`, así que
// "la ruta de API valida antes de llamar al RPC" no protege nada si el RPC
// se puede llamar directo por /rest/v1/rpc. Mismo agujero que cancel_order/
// confirm_order (fix 2026-10-20, order-rpc-authorization.test.ts).
//
// Qué se verifica acá, por PostgREST con tres clientes (anon, admin de otra
// Store, admin de la Store), como lo haría un atacante o la app real:
// - Las RPC de admin no tienen EXECUTE para anon (42501) y rechazan al admin
//   de otra Store adentro de la función ('Forbidden'), incluida
//   increment_product_stock_batch, que antes solo quedaba protegida por la
//   función interna que llama.
// - Siguen funcionando para el admin de la Store (el REVOKE no se llevó a
//   `authenticated`).
// - add_order_item_variedades sigue abierta a anon (checkout público) pero
//   solo sobre un pedido pendiente, creado hace minutos y sin Variedades
//   todavía: ya no sirve para tocar pedidos ajenos existentes.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type RpcArgs = Record<string, unknown>;
type AdminRpc = { name: string; args: (storeId: number, productId: number) => RpcArgs };

const today = new Date().toISOString().slice(0, 10);

// Orden importa para el caso "admin de la Store": upsert crea la fila de
// stock que increment y batch después suman.
const ADMIN_RPCS: AdminRpc[] = [
  { name: 'export_productos', args: (s) => ({ p_store_id: s }) },
  { name: 'export_ventas', args: (s) => ({ p_store_id: s }) },
  { name: 'get_all_products_with_stock', args: (s) => ({ p_store_id: s }) },
  { name: 'get_avg_stock_per_product', args: (s) => ({ p_store_id: s, p_start_date: today, p_end_date: today }) },
  { name: 'get_low_stock_products', args: (s) => ({ p_store_id: s }) },
  { name: 'get_stock_value_per_day', args: (s) => ({ p_store_id: s, p_start_date: today, p_end_date: today }) },
  { name: 'get_top_categories', args: (s) => ({ p_store_id: s }) },
  { name: 'get_top_products', args: (s) => ({ p_store_id: s }) },
  { name: 'refresh_product_affinity', args: (s) => ({ p_store_id: s }) },
  { name: 'upsert_product_stock', args: (s, p) => ({ p_product_id: p, p_quantity: 5, p_store_id: s }) },
  { name: 'increment_product_stock', args: (s, p) => ({ p_product_id: p, p_increment: 1, p_store_id: s }) },
  { name: 'increment_product_stock_batch', args: (s, p) => ({ p_entries: [{ product_id: p, increment: 1 }], p_store_id: s }) },
];

describe('RPC SECURITY DEFINER: quién puede llamar a qué (#154)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const anon = createClient(url ?? '', anonKey ?? '');
  const storeIds: number[] = [];
  const userIds: string[] = [];
  const productIds: number[] = [];
  const orderIds: number[] = [];
  let storeAId: number;
  let storeBId: number;
  let productAId: number;
  let adminAClient: SupabaseClient;
  let adminBClient: SupabaseClient;

  async function createStore(prefix: string) {
    const slug = `${prefix}-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin.from('stores').insert({ slug, name: slug, feature_flags: { stock: true } }).select('id').single();
    expect(error).toBeNull();
    storeIds.push(data!.id);
    return data!.id as number;
  }

  async function signedInAdmin(storeId: number) {
    const email = `__test_secdef_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(error).toBeNull();
    const userId = data!.user!.id;
    userIds.push(userId);
    expect((await admin.from('profiles').insert({ id: userId, email, role: 'user' })).error).toBeNull();
    expect((await admin.from('store_admins').insert({ profile_id: userId, store_id: storeId, role: 'admin' })).error).toBeNull();
    const client = createClient(url ?? '', anonKey ?? '');
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    return client;
  }

  async function createProduct(storeId: number) {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `p-${randomUUID().slice(0, 8)}`, price: 100, cost: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    return data!.id as number;
  }

  async function anonOrderInStoreA(): Promise<number> {
    const { data, error } = await anon.rpc('create_order', {
      p_user_id: null,
      p_notes: 'pedido #154',
      p_whatsapp_message: null,
      p_items: [{ product_id: productAId, product_name: 'x', quantity: 1, unit_price: 100, unit_cost: 50, is_by_weight: false }],
      p_store_id: storeAId,
    });
    expect(error).toBeNull();
    orderIds.push(data.order_id);
    return data.order_id as number;
  }

  // Sin `id`: order_item_variedades.variedad_id es nullable (la Variedad se
  // puede borrar después), así que alcanza con el nombre congelado y no hace
  // falta sembrar una Familia/Variedad para probar quién puede llamar.
  function addVariedades(client: SupabaseClient, orderId: number) {
    return client.rpc('add_order_item_variedades', {
      p_order_id: orderId,
      p_store_id: storeAId,
      p_selections: [[{ name: 'Chocolate' }]],
    });
  }

  async function variedadesCount(orderId: number): Promise<number> {
    const { data: items } = await admin.from('order_items').select('id').eq('order_id', orderId);
    const { count } = await admin
      .from('order_item_variedades')
      .select('id', { count: 'exact', head: true })
      .in('order_item_id', (items ?? []).map((i) => i.id));
    return count ?? 0;
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeAId = await createStore('test-secdef-a');
    storeBId = await createStore('test-secdef-b');
    productAId = await createProduct(storeAId);
    adminAClient = await signedInAdmin(storeAId);
    adminBClient = await signedInAdmin(storeBId);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    if (orderIds.length) {
      await admin.from('order_items').delete().in('order_id', orderIds);
      await admin.from('orders').delete().in('id', orderIds);
    }
    await admin.from('product_affinity').delete().in('store_id', storeIds);
    await admin.from('stock_movement_log').delete().in('product_id', productIds);
    await admin.from('product_stock').delete().in('product_id', productIds);
    await admin.from('products').delete().in('id', productIds);
    await admin.from('store_admins').delete().in('profile_id', userIds);
    await admin.from('profiles').delete().in('id', userIds);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    await admin.from('stores').delete().in('id', storeIds);
  });

  describe('RPC de admin', () => {
    it.skipIf(!hasCredentials)('un visitante sin sesión no tiene EXECUTE sobre ninguna (42501)', async () => {
      for (const rpc of ADMIN_RPCS) {
        const { data, error } = await anon.rpc(rpc.name, rpc.args(storeAId, productAId));
        expect(error?.code, rpc.name).toBe('42501');
        expect(data, rpc.name).toBeNull();
      }
    });

    it.skipIf(!hasCredentials)('el admin de otra Store recibe Forbidden adentro de la función', async () => {
      for (const rpc of ADMIN_RPCS) {
        const { data, error } = await adminBClient.rpc(rpc.name, rpc.args(storeAId, productAId));
        expect(error?.message, rpc.name).toMatch(/Forbidden/);
        expect(data, rpc.name).toBeNull();
      }
      // Nada de lo anterior tocó el stock de la Store A.
      const { data: stock } = await admin.from('product_stock').select('quantity').eq('product_id', productAId).maybeSingle();
      expect(stock).toBeNull();
    });

    it.skipIf(!hasCredentials)('el admin de la Store sigue pudiendo llamarlas todas', async () => {
      for (const rpc of ADMIN_RPCS) {
        const { error } = await adminAClient.rpc(rpc.name, rpc.args(storeAId, productAId));
        expect(error, rpc.name).toBeNull();
      }
      const { data: stock } = await admin.from('product_stock').select('quantity').eq('product_id', productAId).single();
      // upsert 5 + increment 1 + batch 1
      expect(Number(stock!.quantity)).toBe(7);
    });
  });

  describe('add_order_item_variedades sigue abierta al checkout público, pero acotada', () => {
    it.skipIf(!hasCredentials)('un visitante guarda las Variedades de su pedido recién creado', async () => {
      const orderId = await anonOrderInStoreA();

      const { error } = await addVariedades(anon, orderId);

      expect(error).toBeNull();
      expect(await variedadesCount(orderId)).toBe(1);
    });

    it.skipIf(!hasCredentials)('no se pueden agregar Variedades dos veces al mismo pedido', async () => {
      const orderId = await anonOrderInStoreA();
      expect((await addVariedades(anon, orderId)).error).toBeNull();

      const { error } = await addVariedades(anon, orderId);

      expect(error?.message).toMatch(/Forbidden/);
      expect(await variedadesCount(orderId)).toBe(1);
    });

    it.skipIf(!hasCredentials)('un pedido confirmado ya no acepta Variedades', async () => {
      const orderId = await anonOrderInStoreA();
      expect((await admin.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: null })).error).toBeNull();

      const { error } = await addVariedades(anon, orderId);

      expect(error?.message).toMatch(/Forbidden/);
      expect(await variedadesCount(orderId)).toBe(0);
    });

    it.skipIf(!hasCredentials)('un pedido pendiente viejo ya no acepta Variedades', async () => {
      const orderId = await anonOrderInStoreA();
      const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
      expect((await admin.from('orders').update({ created_at: elevenMinutesAgo }).eq('id', orderId)).error).toBeNull();

      const { error } = await addVariedades(anon, orderId);

      expect(error?.message).toMatch(/Forbidden/);
      expect(await variedadesCount(orderId)).toBe(0);
    });
  });
});
