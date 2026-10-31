import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOrder } from '@/features/orders/services/orderService';

// #160 (spec #157, ADR-0016): con Control de stock, un Faltante nunca impide
// registrar el pedido. El Descuento de stock descuenta igual (el stock puede
// quedar negativo) y el ítem guarda su Faltante: cuánto faltaba respecto de
// lo Disponible en ese momento, en las mismas unidades que la cantidad
// (combos para un combo).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey && anonKey);

describe('Faltante — el pedido se registra aunque no alcance el stock (#160)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');

  let storeId: number;
  // stock_movement_log exige performed_by: el trigger lo toma de updated_by.
  // Es Store admin de la Store de prueba: es quien queda como updated_by de
  // una fila de stock creada por un pedido anónimo.
  let userId: string;
  const productIds: number[] = [];
  const orderIds: number[] = [];

  async function createProduct(fields: Record<string, unknown> = {}): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `p-${randomUUID().slice(0, 8)}`, price: 100, cost: 50, image: '', categories: '', store_id: storeId, active: false, ...fields })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    return data!.id;
  }

  async function setStock(productId: number, quantity: number) {
    const { error } = await admin.from('product_stock').insert({ product_id: productId, quantity, store_id: storeId, updated_by: userId });
    expect(error).toBeNull();
  }

  async function addComponent(combo: number, component: number, quantity: number) {
    const { error } = await admin
      .from('combo_components')
      .insert({ combo_product_id: combo, component_product_id: component, quantity, store_id: storeId });
    expect(error).toBeNull();
  }

  async function stockOf(productId: number): Promise<number | null> {
    const { data } = await admin.from('product_stock').select('quantity').eq('product_id', productId).maybeSingle();
    return data ? Number(data.quantity) : null;
  }

  async function order(items: Array<{ productId: number; quantity: number; isByWeight?: boolean }>, client = admin) {
    const { data, error } = await client.rpc('create_order', {
      p_user_id: null,
      p_notes: 'pedido de prueba #160',
      p_whatsapp_message: null,
      p_items: items.map(({ productId, quantity, isByWeight = false }) => ({
        product_id: productId, product_name: 'x', quantity, unit_price: 100, unit_cost: 50, is_by_weight: isByWeight,
      })),
      p_store_id: storeId,
    });
    expect(error).toBeNull();
    orderIds.push(data.order_id);
    return data as { order_id: number; total: number };
  }

  // NULL (sin Control de stock) y 0 (sin Faltante) no son lo mismo: no se
  // colapsan acá.
  async function shortfallsOf(orderId: number): Promise<Map<number, number | null>> {
    const { data, error } = await admin.from('order_items').select('product_id, shortfall').eq('order_id', orderId);
    expect(error).toBeNull();
    return new Map((data ?? []).map((row) => [row.product_id as number, row.shortfall == null ? null : Number(row.shortfall)]));
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-shortfall-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { stock: true } })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const email = `__test_shortfall_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();
    const { error: adminError } = await admin.from('store_admins').insert({ profile_id: userId, store_id: storeId });
    expect(adminError).toBeNull();
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
    await admin.from('combo_components').delete().in('combo_product_id', productIds);
    await admin.from('products').delete().in('id', productIds);
    await admin.from('store_admins').delete().eq('profile_id', userId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('un ítem que pide de más registra el pedido, deja el stock negativo y guarda el Faltante', async () => {
    const productId = await createProduct();
    await setStock(productId, 1);

    const { order_id, total } = await order([{ productId, quantity: 3 }]);

    expect(total).toBe(300);
    expect(await stockOf(productId)).toBe(-2);
    expect((await shortfallsOf(order_id)).get(productId)).toBe(2);
  });

  it.skipIf(!hasCredentials)('un pedido dentro de lo Disponible descuenta sin Faltante', async () => {
    const productId = await createProduct();
    await setStock(productId, 5);

    const { order_id } = await order([{ productId, quantity: 3 }]);

    expect(await stockOf(productId)).toBe(2);
    expect((await shortfallsOf(order_id)).get(productId)).toBe(0);
  });

  it.skipIf(!hasCredentials)('un producto sin fila de stock termina con una fila en negativo', async () => {
    const productId = await createProduct();

    const { order_id } = await order([{ productId, quantity: 4 }]);

    expect(await stockOf(productId)).toBe(-4);
    expect((await shortfallsOf(order_id)).get(productId)).toBe(4);
    // La venta queda en el historial de movimientos, a nombre del Store admin.
    const { data: movements } = await admin
      .from('stock_movement_log')
      .select('movement_type, previous_qty, new_qty, performed_by')
      .eq('product_id', productId);
    expect(movements).toEqual([{ movement_type: 'sale', previous_qty: 0, new_qty: -4, performed_by: userId }]);
  });

  it.skipIf(!hasCredentials)('un comprador logueado no queda como autor de la fila de stock que crea su pedido', async () => {
    const email = `__test_shortfall_buyer_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(authError).toBeNull();
    const buyerId = authData!.user!.id;
    try {
      expect((await admin.from('profiles').insert({ id: buyerId, email, role: 'user' })).error).toBeNull();
      const buyer = createClient(url ?? '', anonKey ?? '', { auth: { persistSession: false } });
      expect((await buyer.auth.signInWithPassword({ email, password })).error).toBeNull();
      const productId = await createProduct();

      await order([{ productId, quantity: 1 }], buyer);

      const { data: row } = await admin.from('product_stock').select('updated_by').eq('product_id', productId).single();
      expect(row!.updated_by).toBe(userId);
    } finally {
      await admin.from('profiles').delete().eq('id', buyerId);
      await admin.auth.admin.deleteUser(buyerId);
    }
  });

  it.skipIf(!hasCredentials)('un Store admin que vende por POS queda como autor de la fila de stock que crea', async () => {
    // Un segundo Store admin, más nuevo: si quedara el más antiguo (userId)
    // no se distinguiría del caso anónimo.
    const email = `__test_shortfall_pos_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(authError).toBeNull();
    const posAdminId = authData!.user!.id;
    try {
      expect((await admin.from('profiles').insert({ id: posAdminId, email, role: 'user' })).error).toBeNull();
      expect((await admin.from('store_admins').insert({ profile_id: posAdminId, store_id: storeId })).error).toBeNull();
      const posAdmin = createClient(url ?? '', anonKey ?? '', { auth: { persistSession: false } });
      expect((await posAdmin.auth.signInWithPassword({ email, password })).error).toBeNull();
      const productId = await createProduct();

      await order([{ productId, quantity: 1 }], posAdmin);

      const { data: row } = await admin.from('product_stock').select('updated_by').eq('product_id', productId).single();
      expect(row!.updated_by).toBe(posAdminId);
    } finally {
      await admin.from('stock_movement_log').delete().eq('performed_by', posAdminId);
      await admin.from('product_stock').update({ updated_by: userId }).eq('updated_by', posAdminId);
      await admin.from('store_admins').delete().eq('profile_id', posAdminId);
      await admin.from('profiles').delete().eq('id', posAdminId);
      await admin.auth.admin.deleteUser(posAdminId);
    }
  });

  it.skipIf(!hasCredentials)('un producto por peso guarda el Faltante en gramos', async () => {
    // Stock 300 g; el carrito pide 500 g.
    const productId = await createProduct({ sale_type: 'kg' });
    await setStock(productId, 300);

    const { order_id } = await order([{ productId, quantity: 500, isByWeight: true }]);

    expect(await stockOf(productId)).toBe(-200);
    expect((await shortfallsOf(order_id)).get(productId)).toBe(200);
  });

  it.skipIf(!hasCredentials)('un combo con un componente insuficiente guarda el Faltante en combos', async () => {
    // 1 combo = 2 de A + 1 de B. A = 5 (alcanza para 2 combos), B = 10.
    const comboId = await createProduct({ is_combo: true });
    const componentA = await createProduct();
    const componentB = await createProduct();
    await addComponent(comboId, componentA, 2);
    await addComponent(comboId, componentB, 1);
    await setStock(componentA, 5);
    await setStock(componentB, 10);

    const { order_id } = await order([{ productId: comboId, quantity: 3 }]);

    expect((await shortfallsOf(order_id)).get(comboId)).toBe(1);
    expect(await stockOf(componentA)).toBe(-1);
    expect(await stockOf(componentB)).toBe(7);
  });

  it.skipIf(!hasCredentials)('el Faltante de un ítem tiene en cuenta lo que ya descontaron los ítems anteriores del pedido', async () => {
    // El combo usa 1 de A; A = 2. El primer ítem (A suelto x2) agota A.
    const componentA = await createProduct();
    const comboId = await createProduct({ is_combo: true });
    await addComponent(comboId, componentA, 1);
    await setStock(componentA, 2);

    const { order_id } = await order([
      { productId: componentA, quantity: 2 },
      { productId: comboId, quantity: 1 },
    ]);

    const shortfalls = await shortfallsOf(order_id);
    expect(shortfalls.get(componentA)).toBe(0);
    expect(shortfalls.get(comboId)).toBe(1);
    expect(await stockOf(componentA)).toBe(-1);
  });

  it.skipIf(!hasCredentials)('cancelar un pedido con Faltante devuelve exactamente lo descontado', async () => {
    const comboId = await createProduct({ is_combo: true });
    const componentA = await createProduct();
    const plainId = await createProduct();
    await addComponent(comboId, componentA, 2);
    await setStock(componentA, 3);
    await setStock(plainId, 1);

    const { order_id } = await order([
      { productId: comboId, quantity: 2 },
      { productId: plainId, quantity: 4 },
    ]);
    expect(await stockOf(componentA)).toBe(-1);
    expect(await stockOf(plainId)).toBe(-3);

    const { error } = await admin.rpc('cancel_order', { p_order_id: order_id });
    expect(error).toBeNull();

    expect(await stockOf(componentA)).toBe(3);
    expect(await stockOf(plainId)).toBe(1);
  });

  it.skipIf(!hasCredentials)('borrar un ítem con Faltante devuelve exactamente lo descontado', async () => {
    const productId = await createProduct();
    await setStock(productId, 1);
    const { order_id } = await order([{ productId, quantity: 3 }]);

    const { error } = await admin.from('order_items').delete().eq('order_id', order_id);
    expect(error).toBeNull();

    expect(await stockOf(productId)).toBe(1);
  });

  it.skipIf(!hasCredentials)('una venta por POS que pide de más se registra con el mismo Faltante', async () => {
    const productId = await createProduct();
    await setStock(productId, 2);

    // Tal como arma pos/orders/route.ts (ver pos-order-creation.test.ts).
    const result = await createOrder(admin, storeId, {
      notes: 'Venta directa',
      whatsapp_message: '[POS] Venta directa',
      items: [{ product_id: productId, product_name: 'x', quantity: 5, unit_price: 100, is_by_weight: false, from_suggestion: false }],
    });
    orderIds.push(result.order_id);

    expect(result.status).toBe('pending');
    expect(await stockOf(productId)).toBe(-3);
    expect((await shortfallsOf(result.order_id)).get(productId)).toBe(3);
  });
});
