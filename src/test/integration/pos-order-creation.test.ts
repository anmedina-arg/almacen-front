import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOrder } from '@/features/orders/services/orderService';

// #121: POS ahora reusa orderService.createOrder() en vez de armar su
// propio RPC call. La afirmación central del ticket es que esto es seguro
// — POSView.tsx manda unit_price = product.price sin escalar (a
// diferencia del carrito público), así que el unit_cost recalculado
// server-side por createOrder() (unit_price * cost/price) da el mismo
// resultado que el unit_cost crudo que POS mandaba antes directo
// (product.cost). Se prueba armando el input tal como lo arma la ruta de
// POS (sin campo unit_cost, is_by_weight/from_suggestion explícitos) y
// llamando a createOrder() directo — no vía HTTP, mismo criterio que
// require-flag.test.ts: simular una sesión admin real por curl es más
// frágil que llamar a la función con su contrato real.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('creación de pedido vía POS (#121)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let productId: number;
  let orderId: number;

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-pos-order-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin.from('stores').insert({ slug, name: slug }).select('id').single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    // price=100, cost=60 -> ratio cost/price = 0.6
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: `${slug}-producto`, price: 100, cost: 60, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();
    productId = product!.id;
    await admin.from('product_price_history').delete().eq('product_id', productId);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    if (orderId) {
      await admin.from('order_items').delete().eq('order_id', orderId);
      await admin.from('orders').delete().eq('id', orderId);
    }
    await admin.from('product_price_history').delete().eq('product_id', productId);
    await admin.from('products').delete().eq('id', productId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('crea el pedido y recalcula unit_cost server-side igual al que POS mandaba directo', async () => {
    // Tal como arma pos/orders/route.ts: unit_price = product.price sin
    // escalar, sin campo unit_cost, from_suggestion siempre false.
    const result = await createOrder(admin, storeId, {
      notes: 'Venta directa',
      whatsapp_message: '[POS] Venta directa',
      items: [
        {
          product_id: productId,
          product_name: 'producto de prueba',
          quantity: 3,
          unit_price: 100,
          is_by_weight: false,
          from_suggestion: false,
        },
      ],
    });

    expect(result.order_id).toBeDefined();
    orderId = result.order_id;
    expect(result.total).toBe(300);
    expect(result.status).toBe('pending');

    const { data: items } = await admin.from('order_items').select('unit_cost, unit_price, quantity').eq('order_id', orderId);
    expect(items).toHaveLength(1);
    // unit_price(100) * (cost(60)/price(100)) = 60 — igual al product.cost
    // crudo que POS mandaba directo antes de #121.
    expect(Number(items![0].unit_cost)).toBe(60);
  });
});
