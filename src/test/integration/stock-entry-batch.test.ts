import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// #122: stock/entry pasó de N llamadas a increment_product_stock() (una
// por fila, vía Promise.all desde TypeScript) a una sola llamada a
// increment_product_stock_batch() — un round-trip, best-effort por fila
// DENTRO de la función SQL (savepoint implícito por entrada). Este test
// verifica exactamente eso: que una fila inválida no frena a las demás, y
// que el resultado por-item se sigue devolviendo — el comportamiento
// observable no cambió, solo el número de round-trips.
//
// Sesión firmada con la anon key (no el client de service role) porque
// increment_product_stock() —y por lo tanto el batch, que la reusa por
// fila— chequea is_store_admin(), que depende de auth.uid(); mismo patrón
// que store-scoping-stock.test.ts.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

describe('increment_product_stock_batch (#122)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let userId: string;
  let productAId: number;
  let productBId: number;
  let client: SupabaseClient;

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-stock-batch-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin.from('stores').insert({ slug, name: slug }).select('id').single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const email = `__test_stock_batch_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(authError).toBeNull();
    userId = authData!.user!.id;
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();
    const { error: membershipError } = await admin.from('store_admins').insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    const { data: productA, error: aError } = await admin
      .from('products')
      .insert({ name: `${slug}-a`, price: 100, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(aError).toBeNull();
    productAId = productA!.id;

    const { data: productB, error: bError } = await admin
      .from('products')
      .insert({ name: `${slug}-b`, price: 100, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(bError).toBeNull();
    productBId = productB!.id;

    await admin.from('product_price_history').delete().in('product_id', [productAId, productBId]);

    // Solo A arranca con stock cargado.
    const { error: stockError } = await admin.from('product_stock').insert({ product_id: productAId, quantity: 10, store_id: storeId, updated_by: userId });
    expect(stockError).toBeNull();

    client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('stock_movement_log').delete().in('product_id', [productAId, productBId]);
    await admin.from('product_stock').delete().in('product_id', [productAId, productBId]);
    await admin.from('product_price_history').delete().in('product_id', [productAId, productBId]);
    await admin.from('products').delete().in('id', [productAId, productBId]);
    await admin.from('store_admins').delete().eq('store_id', storeId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('aplica las filas válidas y reporta la inválida sin frenar el lote (un solo round-trip)', async () => {
    const { data, error } = await client.rpc('increment_product_stock_batch', {
      p_entries: [
        { product_id: productAId, increment: 5, notes: 'reposición' },
        // increment <= 0 -> increment_product_stock() la rechaza (RAISE
        // EXCEPTION), capturado por el bloque BEGIN/EXCEPTION de esa
        // entrada — no debe frenar la de A.
        { product_id: productBId, increment: -1, notes: null },
      ],
      p_store_id: storeId,
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const resultA = data.find((r: { product_id: number }) => r.product_id === productAId);
    const resultB = data.find((r: { product_id: number }) => r.product_id === productBId);

    expect(resultA.success).toBe(true);
    expect(resultB.success).toBe(false);
    expect(resultB.error).toBeDefined();

    const { data: stockA } = await admin.from('product_stock').select('quantity').eq('product_id', productAId).single();
    expect(Number(stockA!.quantity)).toBe(15);
  });
});
