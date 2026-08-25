import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el fix de #97 (ver ADR-0012): una Store con la flag `stock`
// apagada tiene que poder crear, editar y cancelar pedidos sin que
// create_order()/adjust_stock_on_item_update()/cancel_order()/
// return_stock_on_item_delete() chequeen ni toquen product_stock — antes
// de este fix, create_order() siempre rechazaba con insufficient_stock
// porque /admin/stock (la única forma de cargar product_stock) está
// gateada por la misma flag, así que una Store con stock:false nunca podía
// tener filas ahí. Pedidos/WhatsApp es una capacidad siempre-encendida, no
// puede depender del estado de otra flag.
//
// También verifica el caso contrario (stock:true) para confirmar que el
// comportamiento existente no se rompió — es una regresión real posible
// dado que las 4 funciones ahora ramifican en base a is_stock_tracked().
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('stock flag independence — create_order/adjust/cancel/delete (#97)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');

  async function createStoreWithProduct(slug: string, stockEnabled: boolean) {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { stock: stockEnabled } })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: `${slug}-producto`, price: 100, cost: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();
    const productId = product!.id;

    // Sin fila de product_stock a propósito — es exactamente el estado real
    // de una Store con stock:false (nunca pudo cargar stock) y también el
    // estado de un producto recién creado en una Store con stock:true que
    // todavía no cargó nada.
    return { storeId, productId };
  }

  async function deleteFixture(productId: number, storeId: number, orderId?: number) {
    if (orderId) {
      await admin.from('order_items').delete().eq('order_id', orderId);
      await admin.from('orders').delete().eq('id', orderId);
    }
    await admin.from('product_price_history').delete().eq('product_id', productId);
    await admin.from('product_stock').delete().eq('product_id', productId);
    await admin.from('products').delete().eq('id', productId);
    await admin.from('stores').delete().eq('id', storeId);
  }

  describe('stock: false — nunca chequea ni toca product_stock', () => {
    let storeId: number;
    let productId: number;
    let orderId: number;

    beforeAll(async () => {
      if (!hasCredentials) return;
      const fixture = await createStoreWithProduct(`test-stock-off-${randomUUID().slice(0, 8)}`, false);
      storeId = fixture.storeId;
      productId = fixture.productId;
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await deleteFixture(productId, storeId, orderId);
    });

    it.skipIf(!hasCredentials)('create_order() crea el pedido sin rechazarlo por falta de stock', async () => {
      const { data, error } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: 'pedido de prueba stock:false',
        p_whatsapp_message: null,
        p_items: [
          { product_id: productId, product_name: 'x', quantity: 5, unit_price: 100, unit_cost: 50, is_by_weight: false },
        ],
        p_store_id: storeId,
      });

      expect(error).toBeNull();
      expect(data?.order_id).toBeDefined();
      orderId = data.order_id;

      const { data: stockRow } = await admin.from('product_stock').select('id').eq('product_id', productId).maybeSingle();
      expect(stockRow).toBeNull();
    });

    it.skipIf(!hasCredentials)('editar la cantidad de un ítem no falla ni crea una fila de product_stock', async () => {
      const { data: item } = await admin.from('order_items').select('id').eq('order_id', orderId).single();

      const { error } = await admin.from('order_items').update({ quantity: 8 }).eq('id', item!.id);
      expect(error).toBeNull();

      const { data: stockRow } = await admin.from('product_stock').select('id').eq('product_id', productId).maybeSingle();
      expect(stockRow).toBeNull();
    });

    it.skipIf(!hasCredentials)('borrar un ítem del pedido no falla', async () => {
      // Segundo ítem insertado directo (no vía create_order, para no
      // depender de otro llamado RPC) — así hay algo que borrar sin dejar
      // el pedido sin ítems.
      const { data: extraItem, error: insertError } = await admin
        .from('order_items')
        .insert({
          order_id: orderId,
          product_id: productId,
          product_name: 'x',
          quantity: 2,
          unit_price: 100,
          unit_cost: 50,
          store_id: storeId,
        })
        .select('id')
        .single();
      expect(insertError).toBeNull();

      const { error: deleteError } = await admin.from('order_items').delete().eq('id', extraItem!.id);
      expect(deleteError).toBeNull();

      const { data: stockRow } = await admin.from('product_stock').select('id').eq('product_id', productId).maybeSingle();
      expect(stockRow).toBeNull();
    });

    it.skipIf(!hasCredentials)('cancelar el pedido no falla', async () => {
      const { data, error } = await admin.rpc('cancel_order', { p_order_id: orderId });
      expect(error).toBeNull();
      expect(data?.status).toBe('cancelled');

      const { data: stockRow } = await admin.from('product_stock').select('id').eq('product_id', productId).maybeSingle();
      expect(stockRow).toBeNull();
    });
  });

  describe('stock: true — sigue chequeando (no regresionó)', () => {
    let storeId: number;
    let productId: number;

    beforeAll(async () => {
      if (!hasCredentials) return;
      const fixture = await createStoreWithProduct(`test-stock-on-${randomUUID().slice(0, 8)}`, true);
      storeId = fixture.storeId;
      productId = fixture.productId;
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await deleteFixture(productId, storeId);
    });

    it.skipIf(!hasCredentials)('create_order() rechaza con insufficient_stock si no hay product_stock', async () => {
      const { data, error } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: 'pedido de prueba stock:true',
        p_whatsapp_message: null,
        p_items: [
          { product_id: productId, product_name: 'x', quantity: 5, unit_price: 100, unit_cost: 50, is_by_weight: false },
        ],
        p_store_id: storeId,
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      const parsed = JSON.parse(error!.message);
      expect(parsed.error).toBe('insufficient_stock');
    });
  });
});
