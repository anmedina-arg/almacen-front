import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el fix de #46: log_price_change() (trigger sobre products) tenía
// un gap donde nunca seteaba store_id en las filas que inserta en
// product_price_history, a pesar de que la tabla lo tiene. Cualquier cambio
// de precio real en producción dejaba una fila con store_id NULL — 39 filas
// huérfanas encontradas en producción durante la investigación de #22 (que
// necesita las 13 tablas en NOT NULL, y este gap lo bloqueaba).
//
// Usa service_role — esto es sobre qué escribe el trigger, no sobre RLS,
// así que no hace falta una sesión de usuario real (a diferencia de
// store-scoping-products.test.ts).
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('log_price_change() setea store_id en product_price_history (#46)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let productId: number;

  beforeAll(async () => {
    if (!hasCredentials) return;

    const slug = `test-price-history-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    if (productId) {
      await admin.from('product_price_history').delete().eq('product_id', productId);
      await admin.from('products').delete().eq('id', productId);
    }
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('el INSERT de un producto deja store_id seteado en product_price_history', async () => {
    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: 'test-price-history-producto', price: 100, cost: 50, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();
    productId = product!.id;

    const { data: rows, error } = await admin
      .from('product_price_history')
      .select('store_id')
      .eq('product_id', productId)
      .order('changed_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.store_id).toBe(storeId);
  });

  it.skipIf(!hasCredentials)('el UPDATE de precio/costo deja store_id seteado en la fila nueva', async () => {
    const { error: updateError } = await admin
      .from('products')
      .update({ price: 150 })
      .eq('id', productId);
    expect(updateError).toBeNull();

    const { data: rows, error } = await admin
      .from('product_price_history')
      .select('store_id, sale_price')
      .eq('product_id', productId)
      .order('changed_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(Number(rows?.[0]?.sale_price)).toBe(150);
    expect(rows?.[0]?.store_id).toBe(storeId);
  });
});
