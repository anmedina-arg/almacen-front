import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { FEATURE_FLAG_KEYS, resolveFeatureFlags } from '@/lib/store/featureFlags';

// Demo Store (#153): supabase/seed.sql crea la Store y
// supabase/seed/demo-store.sql su contenido. Este test verifica lo que la
// demo da por sentado de la base recién reseteada (`npm run db:reset`), no
// cómo está escrito el seed. Mismo criterio que supabase-test-db.test.ts.
// Lee con service_role para no depender de las policies de cada tabla.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('seed de la Demo Store (#153)', () => {
  const supabase = createClient(url ?? '', serviceRoleKey ?? '');

  async function demoStoreId(): Promise<number> {
    const { data } = await supabase.from('stores').select('id').eq('slug', 'demo-store').single();
    return data!.id;
  }

  it.skipIf(!hasCredentials)('existe demo-store marcada como Demo Store, con número propio y los módulos encendidos salvo stock', async () => {
    const { data: store, error } = await supabase
      .from('stores')
      .select('name, is_demo, whatsapp_number, feature_flags')
      .eq('slug', 'demo-store')
      .single();

    expect(error).toBeNull();
    expect(store?.name).toBe('Demo Store');
    expect(store?.is_demo).toBe(true);
    expect(store?.whatsapp_number).toBeTruthy();
    // stock apagado a propósito: el control de stock es por Store y la demo
    // no carga product_stock — con el flag prendido ningún pedido pasaría.
    const flags = resolveFeatureFlags(store?.feature_flags ?? {});
    for (const key of FEATURE_FLAG_KEYS) {
      expect(flags[key], `flag ${key}`).toBe(key !== 'stock');
    }
  });

  it.skipIf(!hasCredentials)('tiene las categorías Gaseosas, Snacks y Hamburguesas, cada una con productos activos', async () => {
    const storeId = await demoStoreId();
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId)
      .order('sort_order');

    expect(categories?.map((c) => c.name)).toEqual(['Gaseosas', 'Snacks', 'Hamburguesas']);

    for (const category of categories ?? []) {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('category_id', category.id)
        .eq('active', true);
      expect(count, `categoría ${category.name}`).toBeGreaterThan(0);
    }
  });

  it.skipIf(!hasCredentials)('tiene exactamente un Combo, con sus componentes', async () => {
    const storeId = await demoStoreId();
    const { data: combos } = await supabase
      .from('products')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_combo', true);

    expect(combos).toHaveLength(1);

    const { data: components } = await supabase
      .from('combo_components')
      .select('component_product_id, quantity')
      .eq('combo_product_id', combos![0].id);

    expect(components?.length).toBe(3);
  });

  it.skipIf(!hasCredentials)('no tiene stock cargado: el stock nunca bloquea un pedido de demo', async () => {
    const storeId = await demoStoreId();
    const { count } = await supabase
      .from('product_stock')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId);

    expect(count).toBe(0);
  });

  it.skipIf(!hasCredentials)('un pedido de demo se crea aunque no haya stock cargado', async () => {
    const storeId = await demoStoreId();
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('store_id', storeId)
      .eq('is_combo', false)
      .limit(1)
      .single();

    const { data: result, error } = await supabase.rpc('create_order', {
      p_user_id: null,
      p_notes: 'pedido de prueba demo-store-seed.test',
      p_whatsapp_message: null,
      p_items: [
        {
          product_id: product!.id,
          product_name: product!.name,
          quantity: 1,
          unit_price: Number(product!.price),
          unit_cost: 0,
          is_by_weight: false,
        },
      ],
      p_store_id: storeId,
    });

    expect(error).toBeNull();
    const orderId = (result as { order_id?: number } | null)?.order_id;
    expect(orderId).toBeTypeOf('number');

    await supabase.from('order_items').delete().eq('order_id', orderId!);
    await supabase.from('orders').delete().eq('id', orderId!);
  });

  it.skipIf(!hasCredentials)('el seed de contenido es idempotente: volver a correrlo no duplica productos', async () => {
    // Con la base reseteada el seed ya corrió una vez; el contenido se
    // identifica por nombre dentro de la Store, así que no puede haber dos
    // productos con el mismo nombre.
    const storeId = await demoStoreId();
    const { data: products } = await supabase.from('products').select('name').eq('store_id', storeId);
    const names = (products ?? []).map((p) => p.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(20);
  });
});
