import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica get_available_stock() (#159, spec #157): la única definición del
// Disponible (ver CONTEXT.md) que consume el catálogo público, y que después
// va a usar también el registro del pedido (#160). Sin Control de stock no
// devuelve filas; con Control de stock, una fila por producto y nunca
// negativa (desde #160 el stock puede quedar negativo: Disponible 0).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey && anonKey);

describe('get_available_stock — Disponible del catálogo (#159)', () => {
  const admin: SupabaseClient = createClient(url ?? '', serviceRoleKey ?? '');
  const anon: SupabaseClient = createClient(url ?? '', anonKey ?? '');

  const storeIds: number[] = [];
  let trackedStoreId: number;
  let untrackedStoreId: number;
  let plainId: number;
  let noRowId: number;
  let componentAId: number;
  let componentBId: number;
  let comboId: number;
  let comboMissingRowId: number;
  let cappedComboId: number;
  let negativeId: number;
  let comboNegativeComponentId: number;
  let untrackedProductId: number;
  // stock_movement_log exige performed_by: el trigger lo toma de updated_by.
  let userId: string;

  async function createStore(stock: boolean): Promise<number> {
    const slug = `test-available-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { stock } })
      .select('id')
      .single();
    expect(error).toBeNull();
    storeIds.push(data!.id);
    return data!.id;
  }

  async function createProduct(storeId: number, fields: Record<string, unknown> = {}): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `p-${randomUUID().slice(0, 8)}`, price: 100, image: '', categories: '', store_id: storeId, active: true, ...fields })
      .select('id')
      .single();
    expect(error).toBeNull();
    return data!.id;
  }

  async function setStock(storeId: number, productId: number, quantity: number) {
    const { error } = await admin.from('product_stock').insert({ product_id: productId, quantity, store_id: storeId, updated_by: userId });
    expect(error).toBeNull();
  }

  async function addComponent(storeId: number, combo: number, component: number, quantity: number) {
    const { error } = await admin
      .from('combo_components')
      .insert({ combo_product_id: combo, component_product_id: component, quantity, store_id: storeId });
    expect(error).toBeNull();
  }

  async function available(client: SupabaseClient, storeId: number, productIds?: number[]): Promise<Map<number, number>> {
    const { data, error } = await client.rpc('get_available_stock', {
      p_store_id: storeId,
      ...(productIds ? { p_product_ids: productIds } : {}),
    });
    expect(error).toBeNull();
    return new Map((data ?? []).map((row: { product_id: number; available: number }) => [row.product_id, Number(row.available)]));
  }

  beforeAll(async () => {
    if (!hasCredentials) return;

    const email = `__test_available_stock_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    trackedStoreId = await createStore(true);
    plainId = await createProduct(trackedStoreId);
    noRowId = await createProduct(trackedStoreId);
    componentAId = await createProduct(trackedStoreId, { active: false });
    componentBId = await createProduct(trackedStoreId, { active: false });
    comboId = await createProduct(trackedStoreId, { is_combo: true });
    comboMissingRowId = await createProduct(trackedStoreId, { is_combo: true });
    cappedComboId = await createProduct(trackedStoreId, { is_combo: true, max_stock: 2 });
    negativeId = await createProduct(trackedStoreId);
    comboNegativeComponentId = await createProduct(trackedStoreId, { is_combo: true });

    await setStock(trackedStoreId, plainId, 15);
    await setStock(trackedStoreId, componentAId, 10);
    await setStock(trackedStoreId, componentBId, 9);
    await setStock(trackedStoreId, negativeId, -4);

    // combo: A alcanza para 5 (10/2), B para 3 (9/3) → 3.
    await addComponent(trackedStoreId, comboId, componentAId, 2);
    await addComponent(trackedStoreId, comboId, componentBId, 3);
    // Un componente sin fila de stock deja al combo en 0.
    await addComponent(trackedStoreId, comboMissingRowId, componentAId, 1);
    await addComponent(trackedStoreId, comboMissingRowId, noRowId, 1);
    // Alcanza para 3; el stock máximo (2) no entra en la regla (#159).
    await addComponent(trackedStoreId, cappedComboId, componentBId, 3);
    // Un componente con stock negativo deja al combo en 0.
    await addComponent(trackedStoreId, comboNegativeComponentId, componentAId, 1);
    await addComponent(trackedStoreId, comboNegativeComponentId, negativeId, 1);

    // Store sin Control de stock, con una fila vieja en product_stock.
    untrackedStoreId = await createStore(false);
    untrackedProductId = await createProduct(untrackedStoreId);
    await setStock(untrackedStoreId, untrackedProductId, 7);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    for (const storeId of storeIds) {
      await admin.from('combo_components').delete().eq('store_id', storeId);
      await admin.from('stock_movement_log').delete().eq('store_id', storeId);
      await admin.from('product_stock').delete().eq('store_id', storeId);
      await admin.from('product_price_history').delete().eq('store_id', storeId);
      await admin.from('products').delete().eq('store_id', storeId);
      await admin.from('stores').delete().eq('id', storeId);
    }
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it.skipIf(!hasCredentials)('sin Control de stock no devuelve filas, aunque existan filas viejas en product_stock', async () => {
    const rows = await available(admin, untrackedStoreId);
    expect(rows.size).toBe(0);
  });

  it.skipIf(!hasCredentials)('producto común: su stock', async () => {
    expect((await available(admin, trackedStoreId)).get(plainId)).toBe(15);
  });

  it.skipIf(!hasCredentials)('producto sin fila de stock: 0', async () => {
    expect((await available(admin, trackedStoreId)).get(noRowId)).toBe(0);
  });

  it.skipIf(!hasCredentials)('producto con stock negativo: 0', async () => {
    expect((await available(admin, trackedStoreId)).get(negativeId)).toBe(0);
  });

  it.skipIf(!hasCredentials)('combo: limitado por su componente más escaso', async () => {
    expect((await available(admin, trackedStoreId)).get(comboId)).toBe(3);
  });

  it.skipIf(!hasCredentials)('combo con un componente sin fila de stock: 0', async () => {
    expect((await available(admin, trackedStoreId)).get(comboMissingRowId)).toBe(0);
  });

  it.skipIf(!hasCredentials)('combo con un componente con stock negativo: 0', async () => {
    expect((await available(admin, trackedStoreId)).get(comboNegativeComponentId)).toBe(0);
  });

  it.skipIf(!hasCredentials)('combo con stock máximo cargado: el tope no limita el Disponible', async () => {
    expect((await available(admin, trackedStoreId)).get(cappedComboId)).toBe(3);
  });

  it.skipIf(!hasCredentials)('devuelve una fila por cada producto de la Store, y solo de esa Store', async () => {
    const rows = await available(admin, trackedStoreId);
    expect(new Set(rows.keys())).toEqual(
      new Set([plainId, noRowId, componentAId, componentBId, comboId, comboMissingRowId, cappedComboId, negativeId, comboNegativeComponentId])
    );
  });

  it.skipIf(!hasCredentials)('con p_product_ids devuelve solo esos productos', async () => {
    const rows = await available(admin, trackedStoreId, [plainId, comboId, untrackedProductId]);
    expect(Object.fromEntries(rows)).toEqual({ [plainId]: 15, [comboId]: 3 });
  });

  it.skipIf(!hasCredentials)('un visitante anónimo del catálogo obtiene el mismo Disponible de los productos activos', async () => {
    const rows = await available(anon, trackedStoreId, [plainId, noRowId, comboId]);
    expect(Object.fromEntries(rows)).toEqual({ [plainId]: 15, [noRowId]: 0, [comboId]: 3 });
  });
});
