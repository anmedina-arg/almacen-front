import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Spec #179, ticket #181: la columna legacy `products.categories` (texto libre)
// sale del flujo. Un Producto se tiene que poder crear sin enviarla: ni el
// formulario, ni la API, ni la Importación masiva la llenan. La columna sigue
// existiendo hasta el ticket de limpieza (#189), pero ya no es obligatoria.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe.skipIf(!hasCredentials)('Producto sin la columna legacy categories (#181)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const slug = `sin-legacy-${randomUUID().slice(0, 8)}`;
  let storeId: number;

  beforeAll(async () => {
    const { data, error } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: {} })
      .select('id')
      .single();
    expect(error).toBeNull();
    storeId = data!.id;
  });

  afterAll(async () => {
    await admin.from('products').delete().eq('store_id', storeId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it('se puede crear un producto sin enviar `categories`', async () => {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `${slug}-a`, price: 100, image: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data!.id).toBeGreaterThan(0);
  });

  it('se puede crear un producto con `categories` en null', async () => {
    const { error } = await admin
      .from('products')
      .insert({ name: `${slug}-b`, price: 100, image: '', categories: null, store_id: storeId, active: false });
    expect(error).toBeNull();
  });

  it('un producto que ya traía el texto legacy lo conserva intacto (no se toca el dato existente)', async () => {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `${slug}-c`, price: 100, image: '', categories: 'Gaseosas', store_id: storeId, active: false })
      .select('categories')
      .single();
    expect(error).toBeNull();
    expect(data!.categories).toBe('Gaseosas');
  });
});
