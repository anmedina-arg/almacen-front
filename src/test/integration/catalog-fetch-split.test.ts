import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchProductMetadata } from '@/features/catalog/services/fetchProductMetadata';
import { fetchProductStockForProduct } from '@/features/catalog/services/fetchProductStock';
import { fetchTopSellerIds } from '@/features/catalog/services/fetchTopSellerIds';

// Caracteriza el comportamiento de las 3 piezas en las que se partió
// fetchPublicProducts() (#140, spec #139): confirma que devuelven el mismo
// dato que antes traía la función única, ahora de forma independiente.
//
// Las 3 reciben el SupabaseClient por parámetro (mismo patrón que
// resolveStoreAdminStatus en roleHelpers.ts) a propósito: fetchPublicProducts
// en sí usa createSupabaseServerClient(), que llama cookies() de
// next/headers y no se puede invocar fuera de un request real — por eso
// nunca tuvo test de integración. Partir en piezas DI'd es lo que las hace
// testeables acá; fetchPublicProducts (el orquestador que las llama con el
// cliente cookie-based) queda sin cobertura automatizada por el mismo motivo
// que ya vale para roleHelpers — se verifica con smoke test manual.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('catalog fetch split — fetchProductMetadata/fetchProductStock/fetchTopSellerIds (#140)', () => {
  const admin: SupabaseClient = createClient(url ?? '', serviceRoleKey ?? '');

  let storeId: number;
  let userId: string;
  let categoryId: number;
  let categoryName: string;
  let subcategoryId: number;
  let productId: number;
  let comboId: number;
  let componentId: number;
  let componentName: string;
  let slug: string;

  beforeAll(async () => {
    if (!hasCredentials) return;

    slug = `test-catalog-split-${randomUUID().slice(0, 8)}`;
    categoryName = `${slug}-categoria`;
    componentName = `${slug}-componente`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const email = `__test_catalog_split_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { data: category, error: categoryError } = await admin
      .from('categories')
      .insert({ name: categoryName, store_id: storeId, sort_order: 1 })
      .select('id')
      .single();
    expect(categoryError).toBeNull();
    categoryId = category!.id;

    const { data: subcategory, error: subcategoryError } = await admin
      .from('subcategories')
      .insert({ name: `${slug}-subcategoria`, category_id: categoryId, store_id: storeId })
      .select('id')
      .single();
    expect(subcategoryError).toBeNull();
    subcategoryId = subcategory!.id;

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        name: `${slug}-producto`,
        price: 100,
        image: '',
        categories: '',
        store_id: storeId,
        active: true,
        category_id: categoryId,
        subcategory_id: subcategoryId,
      })
      .select('id')
      .single();
    expect(productError).toBeNull();
    productId = product!.id;

    const { data: combo, error: comboError } = await admin
      .from('products')
      .insert({
        name: `${slug}-combo`,
        price: 200,
        image: '',
        categories: '',
        store_id: storeId,
        active: true,
        is_combo: true,
      })
      .select('id')
      .single();
    expect(comboError).toBeNull();
    comboId = combo!.id;

    const { data: component, error: componentError } = await admin
      .from('products')
      .insert({ name: componentName, price: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(componentError).toBeNull();
    componentId = component!.id;

    await admin.from('product_price_history').delete().in('product_id', [productId, comboId, componentId]);

    const { error: comboComponentsError } = await admin
      .from('combo_components')
      .insert({ combo_product_id: comboId, component_product_id: componentId, quantity: 2, store_id: storeId });
    expect(comboComponentsError).toBeNull();

    const { error: stockError } = await admin.from('product_stock').insert([
      { product_id: productId, quantity: 15, store_id: storeId, updated_by: userId },
      { product_id: componentId, quantity: 40, store_id: storeId, updated_by: userId },
    ]);
    expect(stockError).toBeNull();
    await admin.from('stock_movement_log').delete().in('product_id', [productId, componentId]);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('stock_movement_log').delete().in('product_id', [productId, comboId, componentId]);
    await admin.from('product_stock').delete().in('product_id', [productId, componentId]);
    await admin.from('combo_components').delete().eq('combo_product_id', comboId);
    await admin.from('product_price_history').delete().in('product_id', [productId, comboId, componentId]);
    await admin.from('products').delete().eq('store_id', storeId);
    await admin.from('subcategories').delete().eq('store_id', storeId);
    await admin.from('categories').delete().eq('store_id', storeId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('fetchProductMetadata: mapea categoria/subcategoria y arma combo_items solo para el combo', async () => {
    const metadata = await fetchProductMetadata(admin, storeId);
    const byId = new Map(metadata.map((p) => [p.id, p]));

    const product = byId.get(productId);
    expect(product?.category_name).toBe(categoryName);
    expect(product?.subcategory_name).toBeTruthy();
    expect(product?.combo_items).toBeUndefined();

    const combo = byId.get(comboId);
    expect(combo?.combo_items).toEqual([`2 ${componentName}`]);
  });

  it.skipIf(!hasCredentials)('fetchProductMetadata: excluye productos inactivos salvo includeInactive', async () => {
    const withoutInactive = await fetchProductMetadata(admin, storeId);
    expect(withoutInactive.some((p) => p.id === componentId)).toBe(false);

    const withInactive = await fetchProductMetadata(admin, storeId, { includeInactive: true });
    expect(withInactive.some((p) => p.id === componentId)).toBe(true);
  });

  it.skipIf(!hasCredentials)('fetchProductStockForProduct: devuelve la cantidad de un producto puntual (#146)', async () => {
    expect(await fetchProductStockForProduct(admin, storeId, productId)).toBe(15);
    expect(await fetchProductStockForProduct(admin, storeId, componentId)).toBe(40);
  });

  it.skipIf(!hasCredentials)('fetchProductStockForProduct: undefined si el producto no tiene fila en product_stock', async () => {
    // El combo del fixture no tiene fila propia en product_stock (su stock
    // es virtual, derivado de los componentes) — mismo comportamiento que
    // antes de #146, ahora por producto en vez de en el Map bulk.
    expect(await fetchProductStockForProduct(admin, storeId, comboId)).toBeUndefined();
  });

  it.skipIf(!hasCredentials)('fetchTopSellerIds: devuelve un Set, sin el producto recien creado (sin ventas)', async () => {
    const topSellerIds = await fetchTopSellerIds(admin, storeId);
    expect(topSellerIds instanceof Set).toBe(true);
    expect(topSellerIds.has(productId)).toBe(false);
  });
});
