import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getStockByCategory, getStockProducts } from '@/features/dashboard/services/dashboardService';

// #126: getStockByCategory/getStockProducts reusan calculateLineTotal()
// (utils/productUtils.ts) en vez de reimplementar el switch kg/100gr/unit
// que vivía copiado en las dos rutas (audit #106). Este test confirma que
// la sustitución da el mismo resultado que la fórmula original con datos
// reales — no solo "se ve igual leyendo el código".
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('conversión kg/100gr/unit en stock-by-category y stock-products (#126)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let userId: string;
  let categoryId: number;
  let productKgId: number;
  let product100grId: number;
  let productUnitId: number;

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-dashboard-stock-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin.from('stores').insert({ slug, name: slug }).select('id').single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    // updated_by alimenta stock_movement_log.performed_by (NOT NULL) —
    // hace falta un profile_id real (mismo patrón que combo-stock-reservation.test.ts).
    const email = `__test_dashboard_stock_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { data: category, error: categoryError } = await admin
      .from('categories')
      .insert({ name: `${slug}-categoria`, store_id: storeId })
      .select('id')
      .single();
    expect(categoryError).toBeNull();
    categoryId = category!.id;

    // kg: cost=1000 (por kg), stock=2500g -> valor esperado 2500 (2.5kg * 1000)
    const { data: productKg, error: kgError } = await admin
      .from('products')
      .insert({ name: `${slug}-kg`, price: 2000, cost: 1000, image: '', categories: '', store_id: storeId, active: true, sale_type: 'kg', category_id: categoryId })
      .select('id')
      .single();
    expect(kgError).toBeNull();
    productKgId = productKg!.id;

    // 100gr: cost=50 (por 100gr), stock=250g -> valor esperado 125 (2.5 * 50)
    const { data: product100gr, error: gError } = await admin
      .from('products')
      .insert({ name: `${slug}-100gr`, price: 100, cost: 50, image: '', categories: '', store_id: storeId, active: true, sale_type: '100gr', category_id: categoryId })
      .select('id')
      .single();
    expect(gError).toBeNull();
    product100grId = product100gr!.id;

    // unit: cost=10 (por unidad), stock=5 -> valor esperado 50
    const { data: productUnit, error: uError } = await admin
      .from('products')
      .insert({ name: `${slug}-unit`, price: 20, cost: 10, image: '', categories: '', store_id: storeId, active: true, sale_type: 'unit', category_id: categoryId })
      .select('id')
      .single();
    expect(uError).toBeNull();
    productUnitId = productUnit!.id;

    await admin.from('product_price_history').delete().in('product_id', [productKgId, product100grId, productUnitId]);

    const { error: stockError } = await admin.from('product_stock').insert([
      { product_id: productKgId, quantity: 2500, store_id: storeId, updated_by: userId },
      { product_id: product100grId, quantity: 250, store_id: storeId, updated_by: userId },
      { product_id: productUnitId, quantity: 5, store_id: storeId, updated_by: userId },
    ]);
    expect(stockError).toBeNull();
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('stock_movement_log').delete().in('product_id', [productKgId, product100grId, productUnitId]);
    await admin.from('product_stock').delete().in('product_id', [productKgId, product100grId, productUnitId]);
    await admin.from('product_price_history').delete().in('product_id', [productKgId, product100grId, productUnitId]);
    await admin.from('products').delete().in('id', [productKgId, product100grId, productUnitId]);
    await admin.from('categories').delete().eq('id', categoryId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('getStockProducts calcula el valor por producto correctamente para kg/100gr/unit', async () => {
    const categoryName = (await admin.from('categories').select('name').eq('id', categoryId).single()).data!.name;
    const products = await getStockProducts(admin, storeId, categoryName);

    const kg = products.find((p) => p.id === productKgId);
    const g100 = products.find((p) => p.id === product100grId);
    const unit = products.find((p) => p.id === productUnitId);

    expect(kg?.stock_value).toBe(2500);
    expect(g100?.stock_value).toBe(125);
    expect(unit?.stock_value).toBe(50);
  });

  it.skipIf(!hasCredentials)('getStockByCategory suma los valores de la categoría (2500 + 125 + 50 = 2675)', async () => {
    const categories = await getStockByCategory(admin, storeId);
    const categoryName = (await admin.from('categories').select('name').eq('id', categoryId).single()).data!.name;
    const found = categories.find((c) => c.category_name === categoryName);

    expect(found?.total_value).toBe(2675);
  });
});
