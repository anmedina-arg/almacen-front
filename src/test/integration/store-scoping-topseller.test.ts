import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de get_top_seller_ids (#142, hijo de
// #139): el badge "Más vendido" del catálogo público de la Store A nunca
// muestra un producto vendido en la Store B.
//
// A diferencia de get_top_products/get_top_categories (store-scoping-ranking.test.ts,
// #20), esta función la llama el catálogo público sin autenticación
// (fetchPublicProducts.ts) — no hay chequeo de autorización que probar acá,
// solo el filtro de datos: WHERE o.store_id = p_store_id. Por eso el
// fixture no necesita usuario/profile/store_admin, y el RPC se llama con el
// client anon (mismo rol que usa el catálogo público real).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  categoryId: number;
  subcategoryId: number;
  productId: number;
  orderId: number;
};

describe('store scoping — ranking: get_top_seller_ids (#142)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const anon = createClient(url ?? '', anonKey ?? '');
  let storeA: StoreFixture;
  let storeB: StoreFixture;

  async function createFixture(slug: string): Promise<StoreFixture> {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    // Solo hace falta para satisfacer performed_by/updated_by (NOT NULL) en
    // product_stock/stock_movement_log — get_top_seller_ids en sí no
    // requiere autenticación (RPC público, sin chequeo de autorización).
    const email = `__test_scoping_topseller_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { data: category, error: categoryError } = await admin
      .from('categories')
      .insert({ name: `${slug}-categoria`, store_id: storeId, sort_order: 1 })
      .select('id')
      .single();
    expect(categoryError).toBeNull();
    const categoryId = category!.id;

    const { data: subcategory, error: subcategoryError } = await admin
      .from('subcategories')
      .insert({ name: `${slug}-subcategoria`, category_id: categoryId, store_id: storeId })
      .select('id')
      .single();
    expect(subcategoryError).toBeNull();
    const subcategoryId = subcategory!.id;

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
    const productId = product!.id;
    await admin.from('product_price_history').delete().eq('product_id', productId);

    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: productId, quantity: 100, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();
    await admin.from('stock_movement_log').delete().eq('product_id', productId);

    const { data: orderResult, error: orderError } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: `pedido de prueba ${slug}`,
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: productId,
          product_name: `${slug}-producto`,
          quantity: 5,
          unit_price: 100,
          unit_cost: 50,
          is_by_weight: false,
        },
      ],
      p_store_id: storeId,
    });
    expect(orderError).toBeNull();
    const orderId = orderResult.order_id;
    await admin.from('stock_movement_log').delete().eq('product_id', productId);

    return { storeId, userId, categoryId, subcategoryId, productId, orderId };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('order_items').delete().eq('order_id', fixture.orderId);
    await admin.from('orders').delete().eq('id', fixture.orderId);
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('product_stock').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('subcategories').delete().eq('store_id', fixture.storeId);
    await admin.from('categories').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-topseller-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-topseller-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)(
    'la Store A ve su propio producto vendido entre los top sellers',
    async () => {
      const { data, error } = await anon.rpc('get_top_seller_ids', {
        p_days: 30,
        p_store_id: storeA.storeId,
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row: { product_id: number }) => row.product_id);
      expect(ids).toContain(storeA.productId);
    }
  );

  it.skipIf(!hasCredentials)(
    'la Store A NUNCA recibe el producto vendido de la Store B',
    async () => {
      const { data, error } = await anon.rpc('get_top_seller_ids', {
        p_days: 30,
        p_store_id: storeA.storeId,
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row: { product_id: number }) => row.product_id);
      expect(ids).not.toContain(storeB.productId);
    }
  );

  it.skipIf(!hasCredentials)(
    'p_store_id es requerido — sin él, el RPC rechaza la llamada',
    async () => {
      const { error } = await anon.rpc('get_top_seller_ids', { p_days: 30 });

      expect(error).not.toBeNull();
    }
  );
});
