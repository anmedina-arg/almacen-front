import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cancelOrder, confirmOrder, deleteOrder, removeOrderItem } from '@/features/orders/services/orderService';

// #164: eliminar un pedido ("Eliminar pedido" en /admin/orders) devolvía el
// stock siempre, en cualquier estado. Un pedido cancelado ya había devuelto
// su stock al cancelar, y quedaba sumado dos veces (pasó en producción el
// 2026-10-31). Causa: return_stock_on_item_delete() dispara BEFORE DELETE en
// order_items, pero con ON DELETE CASCADE la fila de orders ya no existe,
// el status leído es NULL, y `NULL != 'pending'` no corta.
//
// Decisión (Andrés, 2026-11-05): solo un pedido pendiente devuelve stock al
// eliminarse — equivale a cancelarlo y borrarlo, porque su stock se descontó
// al crearlo (#160) y la venta ya no existe. Confirmado y cancelado no mueven
// stock. Sin Control de stock nunca se mueve nada (ADR-0012).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey && anonKey);

describe('Eliminar un pedido y el stock (#164)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');

  let storeId: number;
  let untrackedStoreId: number;
  // stock_movement_log exige performed_by: el trigger lo toma de updated_by.
  let userId: string;
  const productIds: number[] = [];
  const orderIds: number[] = [];

  async function createProduct(store = storeId, fields: Record<string, unknown> = {}): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `p-${randomUUID().slice(0, 8)}`, price: 100, cost: 50, image: '', categories: '', store_id: store, active: false, ...fields })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    return data!.id;
  }

  async function setStock(productId: number, quantity: number, store = storeId) {
    const { error } = await admin.from('product_stock').insert({ product_id: productId, quantity, store_id: store, updated_by: userId });
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

  async function order(items: Array<{ productId: number; quantity: number }>, store = storeId): Promise<number> {
    const { data, error } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: 'pedido de prueba #164',
      p_whatsapp_message: null,
      p_items: items.map(({ productId, quantity }) => ({
        product_id: productId, product_name: 'x', quantity, unit_price: 100, unit_cost: 50, is_by_weight: false,
      })),
      p_store_id: store,
    });
    expect(error).toBeNull();
    orderIds.push(data.order_id);
    return data.order_id as number;
  }

  async function orderExists(orderId: number): Promise<boolean> {
    const { data } = await admin.from('orders').select('id').eq('id', orderId).maybeSingle();
    return data !== null;
  }

  async function itemOf(orderId: number, productId: number): Promise<number> {
    const { data, error } = await admin.from('order_items').select('id').eq('order_id', orderId).eq('product_id', productId).single();
    expect(error).toBeNull();
    return data!.id;
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-delete-order-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { stock: true } })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const { data: untracked, error: untrackedError } = await admin
      .from('stores')
      .insert({ slug: `${slug}-sin-stock`, name: `${slug}-sin-stock`, feature_flags: { stock: false } })
      .select('id')
      .single();
    expect(untrackedError).toBeNull();
    untrackedStoreId = untracked!.id;

    const email = `__test_delete_order_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();
    const { error: adminError } = await admin.from('store_admins').insert([
      { profile_id: userId, store_id: storeId },
      { profile_id: userId, store_id: untrackedStoreId },
    ]);
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
    await admin.from('stores').delete().in('id', [storeId, untrackedStoreId]);
  });

  it.skipIf(!hasCredentials)('eliminar un pedido cancelado no mueve el stock: ya volvió al cancelar', async () => {
    const productId = await createProduct();
    await setStock(productId, 7);

    const orderId = await order([{ productId, quantity: 2 }]);
    expect(await stockOf(productId)).toBe(5);

    await cancelOrder(admin, storeId, orderId);
    expect(await stockOf(productId)).toBe(7);

    await deleteOrder(admin, storeId, orderId);

    expect(await orderExists(orderId)).toBe(false);
    expect(await stockOf(productId)).toBe(7);
  });

  it.skipIf(!hasCredentials)('eliminar un pedido pendiente devuelve el stock, también el de los componentes de un combo', async () => {
    const simple = await createProduct();
    await setStock(simple, 10);
    const pan = await createProduct();
    const hamburguesa = await createProduct();
    await setStock(pan, 7);
    await setStock(hamburguesa, 15);
    const combo = await createProduct(storeId, { is_combo: true });
    await addComponent(combo, pan, 2);
    await addComponent(combo, hamburguesa, 3);

    const orderId = await order([{ productId: simple, quantity: 4 }, { productId: combo, quantity: 1 }]);
    expect(await stockOf(simple)).toBe(6);
    expect(await stockOf(pan)).toBe(5);
    expect(await stockOf(hamburguesa)).toBe(12);

    await deleteOrder(admin, storeId, orderId);

    expect(await orderExists(orderId)).toBe(false);
    expect(await stockOf(simple)).toBe(10);
    expect(await stockOf(pan)).toBe(7);
    expect(await stockOf(hamburguesa)).toBe(15);
  });

  it.skipIf(!hasCredentials)('la devolución al eliminar un pendiente queda en el log como "return"', async () => {
    const productId = await createProduct();
    await setStock(productId, 3);
    const orderId = await order([{ productId, quantity: 1 }]);

    await deleteOrder(admin, storeId, orderId);

    const { data } = await admin
      .from('stock_movement_log')
      .select('movement_type, change_qty')
      .eq('product_id', productId)
      .order('id', { ascending: true });
    expect(data?.map((row) => [row.movement_type, Number(row.change_qty)])).toEqual([
      ['initial_count', 3],
      ['sale', -1],
      ['return', 1],
    ]);
  });

  it.skipIf(!hasCredentials)('eliminar un pedido confirmado no mueve el stock: la mercadería ya salió', async () => {
    const productId = await createProduct();
    await setStock(productId, 7);
    const orderId = await order([{ productId, quantity: 2 }]);
    await confirmOrder(admin, storeId, orderId, null);
    expect(await stockOf(productId)).toBe(5);

    await deleteOrder(admin, storeId, orderId);

    expect(await orderExists(orderId)).toBe(false);
    expect(await stockOf(productId)).toBe(5);
  });

  it.skipIf(!hasCredentials)('borrar un ítem suelto de un pedido pendiente sigue devolviendo su stock, combo-aware', async () => {
    const simple = await createProduct();
    await setStock(simple, 10);
    const pan = await createProduct();
    await setStock(pan, 7);
    const combo = await createProduct(storeId, { is_combo: true });
    await addComponent(combo, pan, 2);
    const orderId = await order([{ productId: simple, quantity: 4 }, { productId: combo, quantity: 1 }]);
    expect(await stockOf(simple)).toBe(6);
    expect(await stockOf(pan)).toBe(5);

    await removeOrderItem(admin, storeId, orderId, await itemOf(orderId, combo));

    expect(await orderExists(orderId)).toBe(true);
    expect(await stockOf(pan)).toBe(7);
    expect(await stockOf(simple)).toBe(6);
  });

  it.skipIf(!hasCredentials)('sin Control de stock, eliminar un pendiente no toca product_stock (ADR-0012)', async () => {
    const productId = await createProduct(untrackedStoreId);
    // Una fila vieja de stock puede quedar aunque la flag esté apagada: no se mueve.
    await setStock(productId, 7, untrackedStoreId);
    const orderId = await order([{ productId, quantity: 2 }], untrackedStoreId);
    expect(await stockOf(productId)).toBe(7);

    await deleteOrder(admin, untrackedStoreId, orderId);

    expect(await orderExists(orderId)).toBe(false);
    expect(await stockOf(productId)).toBe(7);
  });

  // #163: la ruta DELETE necesita saber qué productos tocó el borrado para
  // invalidar su stock cacheado en el catálogo (invalidateProductStockTags,
  // igual que cancelar o borrar un ítem). Después del DELETE los ítems ya no
  // existen, así que el servicio los devuelve junto con el estado que tenía
  // el pedido: solo un pendiente movió stock (#164).
  it.skipIf(!hasCredentials)('deleteOrder devuelve el estado y los product_ids del pedido borrado (#163)', async () => {
    const a = await createProduct();
    const b = await createProduct();
    await setStock(a, 5);
    await setStock(b, 5);
    const orderId = await order([{ productId: a, quantity: 1 }, { productId: b, quantity: 2 }]);

    const deleted = await deleteOrder(admin, storeId, orderId);

    expect(deleted.status).toBe('pending');
    expect(deleted.productIds).toHaveLength(2);
    expect(deleted.productIds).toEqual(expect.arrayContaining([a, b]));
    expect(await orderExists(orderId)).toBe(false);
  });

  it.skipIf(!hasCredentials)('deleteOrder de un pedido de otra Store sigue dando Orden no encontrada sin borrar nada', async () => {
    const productId = await createProduct();
    await setStock(productId, 5);
    const orderId = await order([{ productId, quantity: 1 }]);

    await expect(deleteOrder(admin, untrackedStoreId, orderId)).rejects.toThrow('Orden no encontrada');

    expect(await orderExists(orderId)).toBe(true);
    expect(await stockOf(productId)).toBe(4);
  });
});
