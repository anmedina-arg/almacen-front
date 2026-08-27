import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Reproduce y verifica el fix de #103 (incidente real en producción, orden
// #4904/item #11924): nada validaba que product_id perteneciera a la misma
// Store que store_id en order_items, y get_recommendations() mezclaba
// sugerencias de todas las Stores — juntos, un cliente podía agregar al
// pedido un producto de otra tienda desde el checkout público, sin ningún
// rechazo.
//
// Mismo patrón de fixture que store-scoping-orders.test.ts: dos Stores
// reales, cada una con su propio producto/stock/pedido.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  productId: number;
  productName: string;
  orderId: number;
};

describe('cross-store order_items validation (#103)', () => {
  const admin: SupabaseClient = createClient(url ?? '', serviceRoleKey ?? '');
  let storeA: StoreFixture;
  let storeB: StoreFixture;
  const extraOrderIds: number[] = [];

  async function createFixture(slug: string): Promise<StoreFixture> {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    const userId = randomUUID();
    const email = `__test_cross_store_${userId}@example.invalid`;
    // profiles.id -> auth.users no está enforced en test (ver
    // docs/ops/poblar-test-db.md) — un UUID random alcanza como profile_id.
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const productName = `${slug}-producto`;
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: productName, price: 100, image: '', categories: '', store_id: storeId, active: true })
      .select('id')
      .single();
    expect(productError).toBeNull();
    const productId = product!.id;
    await admin.from('product_price_history').delete().eq('product_id', productId);

    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: productId, quantity: 100, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();
    await admin.from('stock_movement_log').delete().eq('product_id', productId);

    // Un pedido "vendido" real, alimenta el fallback top_sold de
    // get_recommendations() — es la pieza que explotó el incidente
    // original: el producto más vendido de una Store se sugería en otra.
    const { data: orderResult, error: orderError } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: `pedido de prueba ${slug}`,
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: productId,
          product_name: productName,
          quantity: 5,
          unit_price: 100,
          unit_cost: 50,
          is_by_weight: false,
        },
      ],
      p_store_id: storeId,
    });
    expect(orderError).toBeNull();
    const orderId = orderResult.order_id;
    await admin.from('stock_movement_log').delete().eq('product_id', productId);

    return { storeId, userId, productId, productName, orderId };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('order_items').delete().eq('order_id', fixture.orderId);
    await admin.from('orders').delete().eq('id', fixture.orderId);
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('product_stock').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-cross-store-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-cross-store-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    for (const orderId of extraOrderIds) {
      await admin.from('order_items').delete().eq('order_id', orderId);
      await admin.from('orders').delete().eq('id', orderId);
    }
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)(
    'trigger: rechaza un INSERT directo en order_items con producto de otra Store',
    async () => {
      const { error } = await admin.from('order_items').insert({
        order_id: storeB.orderId,
        product_id: storeA.productId,
        product_name: storeA.productName,
        quantity: 1,
        unit_price: 100,
        store_id: storeB.storeId,
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/no pertenece a la store/);
    }
  );

  it.skipIf(!hasCredentials)(
    'trigger: rechaza un UPDATE de product_id hacia un producto de otra Store',
    async () => {
      const { data: item, error: insertError } = await admin
        .from('order_items')
        .insert({
          order_id: storeB.orderId,
          product_id: storeB.productId,
          product_name: storeB.productName,
          quantity: 1,
          unit_price: 100,
          store_id: storeB.storeId,
        })
        .select('id')
        .single();
      expect(insertError).toBeNull();

      const { error: updateError } = await admin
        .from('order_items')
        .update({ product_id: storeA.productId })
        .eq('id', item!.id);

      expect(updateError).not.toBeNull();
      expect(updateError?.message).toMatch(/no pertenece a la store/);

      await admin.from('order_items').delete().eq('id', item!.id);
    }
  );

  it.skipIf(!hasCredentials)(
    'create_order(): rechaza el pedido completo si un ítem es de otra Store — no queda orden huérfana',
    async () => {
      const { data, error } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: 'intento cross-store',
        p_whatsapp_message: null,
        p_items: [
          {
            product_id: storeA.productId, // producto de la Store A
            product_name: storeA.productName,
            quantity: 1,
            unit_price: 100,
            unit_cost: 50,
            is_by_weight: false,
          },
        ],
        p_store_id: storeB.storeId, // pedido creado en la Store B
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/no pertenece a la store/);

      // La orden no debe haber quedado creada (el trigger revierte toda la
      // transacción de create_order, INSERT INTO orders incluido).
      const { data: orphanOrders } = await admin
        .from('orders')
        .select('id')
        .eq('store_id', storeB.storeId)
        .eq('notes', 'intento cross-store');
      expect(orphanOrders).toEqual([]);
    }
  );

  it.skipIf(!hasCredentials)(
    'get_recommendations(): nunca sugiere un producto de otra Store, ni por el fallback de más vendidos',
    async () => {
      // storeA.productId se vendió (5 unidades, ver fixture) — antes de
      // #103 esto lo hacía candidato al fallback "más vendidos" para
      // CUALQUIER Store que llamara a la función, no solo la A.
      const { data, error } = await admin.rpc('get_recommendations', {
        p_product_ids: [storeB.productId],
        p_exclude_ids: [],
        p_limit: 10,
        p_store_id: storeB.storeId,
      });

      expect(error).toBeNull();
      const recommendedIds = (data ?? []).map((r: { product_id: number }) => r.product_id);
      expect(recommendedIds).not.toContain(storeA.productId);
    }
  );

  it.skipIf(!hasCredentials)(
    'get_recommendations(): sin p_store_id (caller que se olvida de pasarlo) no devuelve nada, no todo',
    async () => {
      const { data, error } = await admin.rpc('get_recommendations', {
        p_product_ids: [storeA.productId, storeB.productId],
        p_exclude_ids: [],
        p_limit: 10,
      });

      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    }
  );
});
