import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Caracteriza el descuento/devolución de stock combo-aware de las 4
// funciones que lo tocan (create_order, cancel_order,
// adjust_stock_on_item_update, return_stock_on_item_delete) — no había
// ningún test de integración cubriendo esto contra product_stock real, solo
// RLS de combo_components (store-scoping-combos.test.ts). Escrito como red
// de seguridad antes de unificar las 4 en reserve_order_stock/
// return_order_stock (#73): confirma que el refactor no cambia el
// comportamiento observable.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('combo stock — descuento/devolución combo-aware (#73)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');

  // Combo: 1 unidad = 2 de A + 1 de B. Stock inicial: 10 de cada componente.
  async function createFixture(slug: string) {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { stock: true } })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    // updated_by alimenta stock_movement_log.performed_by (NOT NULL, ver
    // log_initial_stock) — no viene de auth.uid(), hace falta un profile_id
    // real (mismo patrón que store-scoping-orders.test.ts).
    const email = `__test_combo_stock_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { data: combo, error: comboError } = await admin
      .from('products')
      .insert({ name: `${slug}-combo`, price: 100, image: '', categories: '', store_id: storeId, active: false, is_combo: true })
      .select('id')
      .single();
    expect(comboError).toBeNull();
    const comboId = combo!.id;

    const { data: componentA, error: aError } = await admin
      .from('products')
      .insert({ name: `${slug}-componente-a`, price: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(aError).toBeNull();
    const componentAId = componentA!.id;

    const { data: componentB, error: bError } = await admin
      .from('products')
      .insert({ name: `${slug}-componente-b`, price: 30, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(bError).toBeNull();
    const componentBId = componentB!.id;

    await admin.from('product_price_history').delete().in('product_id', [comboId, componentAId, componentBId]);

    const { error: componentsError } = await admin.from('combo_components').insert([
      { combo_product_id: comboId, component_product_id: componentAId, quantity: 2, store_id: storeId },
      { combo_product_id: comboId, component_product_id: componentBId, quantity: 1, store_id: storeId },
    ]);
    expect(componentsError).toBeNull();

    const { error: stockError } = await admin.from('product_stock').insert([
      { product_id: componentAId, quantity: 10, store_id: storeId, updated_by: userId },
      { product_id: componentBId, quantity: 10, store_id: storeId, updated_by: userId },
    ]);
    expect(stockError).toBeNull();
    await admin.from('stock_movement_log').delete().in('product_id', [componentAId, componentBId]);

    return { storeId, userId, comboId, componentAId, componentBId };
  }

  type Fixture = Awaited<ReturnType<typeof createFixture>>;

  async function stockOf(productId: number): Promise<number> {
    const { data } = await admin.from('product_stock').select('quantity').eq('product_id', productId).single();
    return Number(data!.quantity);
  }

  async function createComboOrder(fixture: Fixture, quantity: number) {
    return admin.rpc('create_order', {
      p_user_id: null,
      p_notes: `combo x${quantity}`,
      p_whatsapp_message: null,
      p_items: [
        { product_id: fixture.comboId, product_name: 'combo', quantity, unit_price: 100, unit_cost: 50, is_by_weight: false },
      ],
      p_store_id: fixture.storeId,
    });
  }

  async function deleteFixture(fixture: Fixture, orderId?: number) {
    if (orderId) {
      await admin.from('order_items').delete().eq('order_id', orderId);
      await admin.from('orders').delete().eq('id', orderId);
    }
    await admin.from('product_price_history').delete().in('product_id', [fixture.comboId, fixture.componentAId, fixture.componentBId]);
    await admin.from('stock_movement_log').delete().in('product_id', [fixture.componentAId, fixture.componentBId]);
    await admin.from('product_stock').delete().in('product_id', [fixture.componentAId, fixture.componentBId]);
    await admin.from('combo_components').delete().eq('combo_product_id', fixture.comboId);
    await admin.from('products').delete().in('id', [fixture.comboId, fixture.componentAId, fixture.componentBId]);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  describe('create_order() — combo con stock suficiente', () => {
    let fixture: Fixture;
    let orderId: number;

    beforeAll(async () => {
      if (!hasCredentials) return;
      fixture = await createFixture(`test-combo-ok-${randomUUID().slice(0, 8)}`);
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await deleteFixture(fixture, orderId);
    });

    it.skipIf(!hasCredentials)('descuenta cada componente proporcional a la cantidad de combos pedida', async () => {
      const { data, error } = await createComboOrder(fixture, 3);

      expect(error).toBeNull();
      orderId = data.order_id;

      // 3 combos * 2 de A = 6 descontados de 10 -> 4; 3 * 1 de B = 3 descontados de 10 -> 7
      expect(await stockOf(fixture.componentAId)).toBe(4);
      expect(await stockOf(fixture.componentBId)).toBe(7);
    });
  });

  describe('create_order() — combo con stock insuficiente en un componente', () => {
    let fixture: Fixture;

    beforeAll(async () => {
      if (!hasCredentials) return;
      fixture = await createFixture(`test-combo-fail-${randomUUID().slice(0, 8)}`);
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await deleteFixture(fixture);
    });

    it.skipIf(!hasCredentials)('rechaza el pedido entero y no descuenta ningún componente (rollback)', async () => {
      // 15 combos: necesita 30 de A y 15 de B — ninguno alcanza (10 c/u).
      const { data, error } = await createComboOrder(fixture, 15);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      const parsed = JSON.parse(error!.message);
      expect(parsed.error).toBe('insufficient_stock');

      expect(await stockOf(fixture.componentAId)).toBe(10);
      expect(await stockOf(fixture.componentBId)).toBe(10);
    });
  });

  describe('cancel_order() — devuelve stock a cada componente', () => {
    let fixture: Fixture;
    let orderId: number;

    beforeAll(async () => {
      if (!hasCredentials) return;
      fixture = await createFixture(`test-combo-cancel-${randomUUID().slice(0, 8)}`);
      const { data } = await createComboOrder(fixture, 2);
      orderId = data.order_id;
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await deleteFixture(fixture, orderId);
    });

    it.skipIf(!hasCredentials)('devuelve el stock de cada componente al cancelar', async () => {
      // Tras crear (2 combos): A = 10 - 4 = 6, B = 10 - 2 = 8
      expect(await stockOf(fixture.componentAId)).toBe(6);
      expect(await stockOf(fixture.componentBId)).toBe(8);

      const { error } = await admin.rpc('cancel_order', { p_order_id: orderId });
      expect(error).toBeNull();

      expect(await stockOf(fixture.componentAId)).toBe(10);
      expect(await stockOf(fixture.componentBId)).toBe(10);
    });
  });

  describe('adjust_stock_on_item_update — editar cantidad de un ítem combo', () => {
    let fixture: Fixture;
    let orderId: number;
    let itemId: number;

    beforeAll(async () => {
      if (!hasCredentials) return;
      fixture = await createFixture(`test-combo-adjust-${randomUUID().slice(0, 8)}`);
      const { data } = await createComboOrder(fixture, 2);
      orderId = data.order_id;
      const { data: item } = await admin.from('order_items').select('id').eq('order_id', orderId).single();
      itemId = item!.id;
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await deleteFixture(fixture, orderId);
    });

    it.skipIf(!hasCredentials)('subir la cantidad descuenta más stock; bajarla devuelve stock', async () => {
      // Estado inicial (2 combos): A = 6, B = 8
      const { error: upError } = await admin.from('order_items').update({ quantity: 5 }).eq('id', itemId);
      expect(upError).toBeNull();
      // 5 combos: A = 10 - 10 = 0, B = 10 - 5 = 5
      expect(await stockOf(fixture.componentAId)).toBe(0);
      expect(await stockOf(fixture.componentBId)).toBe(5);

      const { error: downError } = await admin.from('order_items').update({ quantity: 1 }).eq('id', itemId);
      expect(downError).toBeNull();
      // 1 combo: A = 10 - 2 = 8, B = 10 - 1 = 9
      expect(await stockOf(fixture.componentAId)).toBe(8);
      expect(await stockOf(fixture.componentBId)).toBe(9);
    });

    it.skipIf(!hasCredentials)('rechaza subir la cantidad si no alcanza el stock de un componente, sin tocar stock', async () => {
      // Tras el test anterior: 1 combo activo, A=8, B=9.
      // Subir a 20 combos necesita 40 de A y 20 de B — ninguno alcanza.
      const { error } = await admin.from('order_items').update({ quantity: 20 }).eq('id', itemId);
      expect(error).not.toBeNull();

      expect(await stockOf(fixture.componentAId)).toBe(8);
      expect(await stockOf(fixture.componentBId)).toBe(9);
    });
  });

  describe('return_stock_on_item_delete — borrar un ítem combo devuelve stock', () => {
    let fixture: Fixture;
    let orderId: number;
    let itemId: number;

    beforeAll(async () => {
      if (!hasCredentials) return;
      fixture = await createFixture(`test-combo-delete-${randomUUID().slice(0, 8)}`);
      const { data } = await createComboOrder(fixture, 2);
      orderId = data.order_id;
      const { data: item } = await admin.from('order_items').select('id').eq('order_id', orderId).single();
      itemId = item!.id;
    });

    afterAll(async () => {
      if (!hasCredentials) return;
      await admin.from('orders').delete().eq('id', orderId);
      await deleteFixture(fixture);
    });

    it.skipIf(!hasCredentials)('devuelve stock de cada componente al borrar el ítem', async () => {
      // Tras crear (2 combos): A = 6, B = 8
      expect(await stockOf(fixture.componentAId)).toBe(6);
      expect(await stockOf(fixture.componentBId)).toBe(8);

      const { error } = await admin.from('order_items').delete().eq('id', itemId);
      expect(error).toBeNull();

      expect(await stockOf(fixture.componentAId)).toBe(10);
      expect(await stockOf(fixture.componentBId)).toBe(10);
    });
  });
});
