import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveProductStockTags } from '@/features/products/services/invalidateProductStock';
import { productStockTag } from '@/lib/cache/tags';

// Verifica la lógica combo-aware de resolveProductStockTags (#146, spec
// #139; dirección componente → combos en #158, spec #157) — la parte de invalidateProductStockTags que sí se puede testear:
// revalidateTag() en sí tira fuera de un request real de Next.js
// (confirmado empíricamente), así que esta función queda separada
// justamente para poder probarla contra datos reales.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('resolveProductStockTags (#146, #158)', () => {
  const admin: SupabaseClient = createClient(url ?? '', serviceRoleKey ?? '');

  let storeId: number;
  let plainProductId: number;
  let comboId: number;
  let componentAId: number;
  let componentBId: number;
  // Segundo combo que comparte el componente B con `comboId` (#158).
  let otherComboId: number;

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-resolve-stock-tags-${randomUUID().slice(0, 8)}`;

    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const { data: plain, error: plainError } = await admin
      .from('products')
      .insert({ name: `${slug}-plain`, price: 100, image: '', categories: '', store_id: storeId, active: true })
      .select('id')
      .single();
    expect(plainError).toBeNull();
    plainProductId = plain!.id;

    const { data: combo, error: comboError } = await admin
      .from('products')
      .insert({ name: `${slug}-combo`, price: 200, image: '', categories: '', store_id: storeId, active: true, is_combo: true })
      .select('id')
      .single();
    expect(comboError).toBeNull();
    comboId = combo!.id;

    const { data: componentA, error: componentAError } = await admin
      .from('products')
      .insert({ name: `${slug}-comp-a`, price: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(componentAError).toBeNull();
    componentAId = componentA!.id;

    const { data: componentB, error: componentBError } = await admin
      .from('products')
      .insert({ name: `${slug}-comp-b`, price: 30, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(componentBError).toBeNull();
    componentBId = componentB!.id;

    const { data: otherCombo, error: otherComboError } = await admin
      .from('products')
      .insert({ name: `${slug}-combo-2`, price: 150, image: '', categories: '', store_id: storeId, active: true, is_combo: true })
      .select('id')
      .single();
    expect(otherComboError).toBeNull();
    otherComboId = otherCombo!.id;

    await admin.from('product_price_history').delete().in('product_id', [plainProductId, comboId, otherComboId, componentAId, componentBId]);

    const { error: componentsError } = await admin.from('combo_components').insert([
      { combo_product_id: comboId, component_product_id: componentAId, quantity: 1, store_id: storeId },
      { combo_product_id: comboId, component_product_id: componentBId, quantity: 2, store_id: storeId },
      { combo_product_id: otherComboId, component_product_id: componentBId, quantity: 1, store_id: storeId },
    ]);
    expect(componentsError).toBeNull();
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('combo_components').delete().in('combo_product_id', [comboId, otherComboId]);
    await admin.from('product_price_history').delete().in('product_id', [plainProductId, comboId, otherComboId, componentAId, componentBId]);
    await admin.from('products').delete().eq('store_id', storeId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('lista vacía de productos devuelve [] sin consultar la base', async () => {
    expect(await resolveProductStockTags(admin, storeId, [])).toEqual([]);
  });

  it.skipIf(!hasCredentials)('un producto plano devuelve solo su propio tag', async () => {
    const tags = await resolveProductStockTags(admin, storeId, [plainProductId]);
    expect(tags).toEqual([productStockTag(storeId, plainProductId)]);
  });

  it.skipIf(!hasCredentials)('un combo devuelve su propio tag MAS el de cada componente MAS los combos que comparten componentes (#158)', async () => {
    const tags = await resolveProductStockTags(admin, storeId, [comboId]);
    expect(new Set(tags)).toEqual(
      new Set([
        productStockTag(storeId, comboId),
        productStockTag(storeId, componentAId),
        productStockTag(storeId, componentBId),
        productStockTag(storeId, otherComboId),
      ])
    );
  });

  it.skipIf(!hasCredentials)('un componente devuelve su propio tag MAS el de cada combo que lo contiene (#158)', async () => {
    const tags = await resolveProductStockTags(admin, storeId, [componentAId]);
    expect(new Set(tags)).toEqual(new Set([productStockTag(storeId, componentAId), productStockTag(storeId, comboId)]));
  });

  it.skipIf(!hasCredentials)('un componente compartido por dos combos devuelve los tags de ambos (#158)', async () => {
    const tags = await resolveProductStockTags(admin, storeId, [componentBId]);
    expect(new Set(tags)).toEqual(
      new Set([
        productStockTag(storeId, componentBId),
        productStockTag(storeId, comboId),
        productStockTag(storeId, otherComboId),
      ])
    );
  });

  it.skipIf(!hasCredentials)('mezcla de producto plano + combo: union sin duplicados', async () => {
    const tags = await resolveProductStockTags(admin, storeId, [
      plainProductId,
      comboId,
    ]);
    expect(new Set(tags)).toEqual(
      new Set([
        productStockTag(storeId, plainProductId),
        productStockTag(storeId, comboId),
        productStockTag(storeId, componentAId),
        productStockTag(storeId, componentBId),
        productStockTag(storeId, otherComboId),
      ])
    );
    expect(tags.length).toBe(new Set(tags).size);
  });
});
