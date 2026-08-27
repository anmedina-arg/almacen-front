import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica #95: la selección de Variedades de una línea de Producto Surtido
// se persiste como paso POSTERIOR a create_order() (add_order_item_variedades,
// #73 — a propósito sin tocar su cuerpo), y el nombre queda congelado —
// sobrevive a que la Variedad original se deshabilite o se borre (spec #91,
// user story 10). Mismo patrón Seam 1 que cross-store-order-item-validation.test.ts:
// fixtures reales vía service role, sin sesión anon (la policy de INSERT
// directa es solo defensiva — el camino real es la RPC SECURITY DEFINER).
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('order_item_variedades — snapshot sobrevive a la Variedad original (#95)', () => {
  const admin: SupabaseClient = createClient(url ?? '', serviceRoleKey ?? '');

  let storeId: number;
  let familiaId: number;
  let variedadId: number;
  let productId: number;
  let fixtureUserId: string;
  const orderIds: number[] = [];

  beforeAll(async () => {
    if (!hasCredentials) return;

    const slug = `test-order-item-variedades-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const { data: familia, error: familiaError } = await admin
      .from('familias')
      .insert({ name: `${slug}-familia`, store_id: storeId })
      .select('id')
      .single();
    expect(familiaError).toBeNull();
    familiaId = familia!.id;

    const { data: variedad, error: variedadError } = await admin
      .from('variedades')
      .insert({ name: `${slug}-variedad`, familia_id: familiaId, store_id: storeId })
      .select('id')
      .single();
    expect(variedadError).toBeNull();
    variedadId = variedad!.id;

    fixtureUserId = randomUUID();
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: fixtureUserId, email: `__test_order_item_variedades_${fixtureUserId}@example.invalid`, role: 'user' });
    expect(profileError).toBeNull();

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        name: `${slug}-producto`,
        price: 100,
        image: '',
        categories: '',
        store_id: storeId,
        active: true,
        is_producto_surtido: true,
        familia_id: familiaId,
        min_variedades: 1,
        max_variedades: 1,
      })
      .select('id')
      .single();
    expect(productError).toBeNull();
    productId = product!.id;
    await admin.from('product_price_history').delete().eq('product_id', productId);

    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: productId, quantity: 100, store_id: storeId, updated_by: fixtureUserId });
    expect(stockError).toBeNull();
    await admin.from('stock_movement_log').delete().eq('product_id', productId);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    for (const orderId of orderIds) {
      await admin.from('order_items').delete().eq('order_id', orderId);
      await admin.from('orders').delete().eq('id', orderId);
    }
    await admin.from('stock_movement_log').delete().eq('product_id', productId);
    await admin.from('product_stock').delete().eq('product_id', productId);
    await admin.from('product_price_history').delete().eq('product_id', productId);
    await admin.from('products').delete().eq('id', productId);
    await admin.from('variedades').delete().eq('familia_id', familiaId);
    await admin.from('familias').delete().eq('id', familiaId);
    await admin.from('profiles').delete().eq('id', fixtureUserId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  async function createOrderWithVariedad(variedadName: string) {
    const { data: orderResult, error: orderError } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: 'pedido de prueba #95',
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: productId,
          product_name: 'producto surtido de prueba',
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
    orderIds.push(orderId);
    await admin.from('stock_movement_log').delete().eq('product_id', productId);

    const { error: variedadesError } = await admin.rpc('add_order_item_variedades', {
      p_order_id: orderId,
      p_store_id: storeId,
      p_selections: [[{ id: variedadId, name: variedadName }]],
    });
    expect(variedadesError).toBeNull();

    return orderId;
  }

  it.skipIf(!hasCredentials)(
    'add_order_item_variedades(): guarda la selección correlacionando por orden de inserción, sin tocar create_order()',
    async () => {
      const orderId = await createOrderWithVariedad('Chocolate');

      const { data: item } = await admin
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .single();

      const { data: rows, error } = await admin
        .from('order_item_variedades')
        .select('variedad_id, variedad_name')
        .eq('order_item_id', item!.id);

      expect(error).toBeNull();
      expect(rows).toEqual([{ variedad_id: variedadId, variedad_name: 'Chocolate' }]);
    }
  );

  it.skipIf(!hasCredentials)(
    'el nombre sobrevive a que la Variedad original se deshabilite',
    async () => {
      const orderId = await createOrderWithVariedad('Frutilla');

      await admin.from('variedades').update({ active: false }).eq('id', variedadId);

      const { data: rows } = await admin
        .from('order_item_variedades')
        .select('variedad_id, variedad_name, order_items!inner(order_id)')
        .eq('order_items.order_id', orderId);

      expect(rows).toEqual([
        { variedad_id: variedadId, variedad_name: 'Frutilla', order_items: { order_id: orderId } },
      ]);

      await admin.from('variedades').update({ active: true }).eq('id', variedadId);
    }
  );

  it.skipIf(!hasCredentials)(
    'el nombre sobrevive a que la Variedad original se borre (variedad_id pasa a NULL)',
    async () => {
      // Variedad descartable, separada de la que usan los demás tests —
      // esta se borra de verdad.
      const { data: disposable, error: disposableError } = await admin
        .from('variedades')
        .insert({ name: 'sabor-descartable-#95', familia_id: familiaId, store_id: storeId })
        .select('id')
        .single();
      expect(disposableError).toBeNull();
      const disposableId = disposable!.id;

      const { data: orderResult } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: 'pedido de prueba #95 (borrado)',
        p_whatsapp_message: null,
        p_items: [
          {
            product_id: productId,
            product_name: 'producto surtido de prueba',
            quantity: 1,
            unit_price: 100,
            unit_cost: 50,
            is_by_weight: false,
          },
        ],
        p_store_id: storeId,
      });
      const orderId = orderResult.order_id;
      orderIds.push(orderId);
      await admin.from('stock_movement_log').delete().eq('product_id', productId);

      await admin.rpc('add_order_item_variedades', {
        p_order_id: orderId,
        p_store_id: storeId,
        p_selections: [[{ id: disposableId, name: 'Dulce de leche' }]],
      });

      await admin.from('variedades').delete().eq('id', disposableId);

      const { data: item } = await admin
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .single();
      const { data: rows } = await admin
        .from('order_item_variedades')
        .select('variedad_id, variedad_name')
        .eq('order_item_id', item!.id);

      expect(rows).toEqual([{ variedad_id: null, variedad_name: 'Dulce de leche' }]);
    }
  );

  it.skipIf(!hasCredentials)(
    'add_order_item_variedades(): rechaza si p_selections no tiene el mismo largo que los order_items de la orden',
    async () => {
      const { data: orderResult } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: 'pedido de prueba #95 (mismatch)',
        p_whatsapp_message: null,
        p_items: [
          {
            product_id: productId,
            product_name: 'producto surtido de prueba',
            quantity: 1,
            unit_price: 100,
            unit_cost: 50,
            is_by_weight: false,
          },
        ],
        p_store_id: storeId,
      });
      const orderId = orderResult.order_id;
      orderIds.push(orderId);
      await admin.from('stock_movement_log').delete().eq('product_id', productId);

      const { error } = await admin.rpc('add_order_item_variedades', {
        p_order_id: orderId,
        p_store_id: storeId,
        p_selections: [[], []], // 2 elementos para 1 solo order_item
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/count mismatch/);
    }
  );
});
