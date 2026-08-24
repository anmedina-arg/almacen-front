import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el fix de #52: log_initial_stock() y log_stock_change()
// (triggers sobre product_stock) tenían el mismo gap que log_price_change()
// (#46) — nunca seteaban store_id en las filas que insertan en
// stock_movement_log, a pesar de que la tabla lo tiene. Cualquier movimiento
// de stock real en producción dejaba una fila con store_id NULL — 676 filas
// huérfanas encontradas en producción durante la investigación de #22.
//
// Usa service_role — esto es sobre qué escriben los triggers, no sobre RLS,
// así que no hace falta una sesión de usuario real (mismo criterio que
// product-price-history-store-id.test.ts, #46).
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('log_initial_stock()/log_stock_change() setean store_id en stock_movement_log (#52)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let userId: string;
  let productId: number;

  beforeAll(async () => {
    if (!hasCredentials) return;

    const slug = `test-movement-log-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const email = `__test_movement_log_${randomUUID()}@example.invalid`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(authError).toBeNull();
    userId = authData!.user!.id;

    // handle_new_user() no está replicado en test — ver store-scoping-products.test.ts.
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: 'test-movement-log-producto', price: 100, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();
    productId = product!.id;
    await admin.from('product_price_history').delete().eq('product_id', productId);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    if (productId) {
      await admin.from('stock_movement_log').delete().eq('product_id', productId);
      await admin.from('product_stock').delete().eq('product_id', productId);
      await admin.from('product_price_history').delete().eq('product_id', productId);
      await admin.from('products').delete().eq('id', productId);
    }
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('el INSERT de product_stock (carga inicial) deja store_id seteado en stock_movement_log', async () => {
    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: productId, quantity: 50, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();

    const { data: rows, error } = await admin
      .from('stock_movement_log')
      .select('store_id, movement_type')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.movement_type).toBe('initial_count');
    expect(rows?.[0]?.store_id).toBe(storeId);
  });

  it.skipIf(!hasCredentials)('el UPDATE de quantity deja store_id seteado en la fila nueva', async () => {
    const { error: updateError } = await admin
      .from('product_stock')
      .update({ quantity: 80 })
      .eq('product_id', productId);
    expect(updateError).toBeNull();

    const { data: rows, error } = await admin
      .from('stock_movement_log')
      .select('store_id, new_qty')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(Number(rows?.[0]?.new_qty)).toBe(80);
    expect(rows?.[0]?.store_id).toBe(storeId);
  });
});
