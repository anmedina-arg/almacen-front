import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de product_stock/stock_movement_log
// (ticket #17): el admin de una Store nunca ve ni modifica el stock de
// otra, ni por API (RPCs upsert_product_stock/get_all_products_with_stock/
// get_low_stock_products, todas store-scoped) ni por RLS directa.
//
// Mismo patrón que store-scoping-products.test.ts / store-scoping-orders.test.ts:
// usuarios de Auth reales (de un solo uso, vía la API admin) + sesión
// firmada con la anon key, para probar la policy en sí — no solo la
// lógica JS.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  productId: number;
  stockId: number;
  logId: number;
  client: SupabaseClient;
};

describe('store scoping — product_stock & stock_movement_log (#17)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
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

    const email = `__test_scoping_stock_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    // handle_new_user() no está replicado en test (ver store-scoping-products.test.ts).
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({ name: `${slug}-producto`, price: 100, image: '', categories: '', store_id: storeId, active: false })
      .select('id')
      .single();
    expect(productError).toBeNull();

    // log_price_change() (trigger pre-existente sobre products, ver
    // supabase_pricing.sql) inserta en product_price_history sin setear
    // store_id (#46, no relacionado a stock) — se borra de inmediato,
    // mismo motivo y mismo patrón que store-scoping-products.test.ts.
    await admin.from('product_price_history').delete().eq('product_id', product!.id);

    // Insertar directo (no vía RPC) para tener la fixture lista sin depender
    // todavía de lo que este ticket cambia. El INSERT dispara log_initial_stock()
    // (AFTER INSERT trigger), que crea una fila en stock_movement_log — pero
    // sin store_id, porque ese trigger no lo setea (#52, sin resolver). Se
    // backfillea a mano acá para poder probar que la policy de RLS aísla
    // correctamente CUANDO store_id está seteado — la policy ya está lista
    // para cuando #52 se resuelva, aunque el trigger todavía no coopere.
    const { data: stock, error: stockError } = await admin
      .from('product_stock')
      // updated_by requerido: performed_by en stock_movement_log (NOT NULL)
      // se copia de acá vía el trigger log_initial_stock().
      .insert({ product_id: product!.id, quantity: 10, min_stock: 5, store_id: storeId, updated_by: userId })
      .select('id')
      .single();
    expect(stockError).toBeNull();

    const { data: log, error: logError } = await admin
      .from('stock_movement_log')
      .select('id')
      .eq('product_id', product!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(logError).toBeNull();

    const { error: backfillError } = await admin
      .from('stock_movement_log')
      .update({ store_id: storeId })
      .eq('id', log!.id);
    expect(backfillError).toBeNull();

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return { storeId, userId, productId: product!.id, stockId: stock!.id, logId: log!.id, client };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('product_price_history').delete().eq('product_id', fixture.productId);
    await admin.from('stock_movement_log').delete().eq('product_id', fixture.productId);
    await admin.from('product_stock').delete().eq('product_id', fixture.productId);
    await admin.from('products').delete().eq('id', fixture.productId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-stock-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-stock-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('upsert_product_stock() etiqueta store_id correctamente', async () => {
    const { data, error } = await storeA.client.rpc('upsert_product_stock', {
      p_product_id: storeA.productId,
      p_quantity: 20,
      p_store_id: storeA.storeId,
    });

    expect(error).toBeNull();
    expect(data?.store_id).toBe(storeA.storeId);
  });

  it.skipIf(!hasCredentials)('upsert_product_stock() rechaza un product_id de otra Store', async () => {
    const { error } = await storeA.client.rpc('upsert_product_stock', {
      p_product_id: storeB.productId,
      p_quantity: 20,
      p_store_id: storeA.storeId,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('Product not found in this store');
  });

  it.skipIf(!hasCredentials)('get_all_products_with_stock() solo trae productos de la Store propia', async () => {
    const { data, error } = await storeA.client.rpc('get_all_products_with_stock', {
      p_store_id: storeA.storeId,
    });

    expect(error).toBeNull();
    const ids = (data ?? []).map((r: { product_id: number }) => r.product_id);
    expect(ids).toContain(storeA.productId);
    expect(ids).not.toContain(storeB.productId);
  });

  it.skipIf(!hasCredentials)('get_all_products_with_stock() rechaza p_store_id de otra Store', async () => {
    const { error } = await storeA.client.rpc('get_all_products_with_stock', {
      p_store_id: storeB.storeId,
    });

    expect(error).not.toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A ve su propio stock vía RLS', async () => {
    const { data, error } = await storeA.client
      .from('product_stock')
      .select('id')
      .eq('id', storeA.stockId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(storeA.stockId);
  });

  // No hay test de SELECT cruzado para product_stock: investigado en code
  // review (ver supabase_fix_stock_scoping_gaps.sql) e intencionalmente
  // revertido — la policy real ("Anyone can view stock", USING true, no
  // "Authenticated users..." como decía el .sql viejo) sostiene el catálogo
  // público para visitantes anónimos vía fetchPublicProducts.ts. Acotarla a
  // is_store_admin() rompería esa lectura para cualquiera sin sesión. El
  // aislamiento de esa lectura para el uso público se resuelve a nivel
  // aplicación (fetchPublicProducts ya filtra por store_id), no por RLS —
  // mismo criterio que "Anyone can read categories" en #15. Lo que sí aísla
  // el puente de este ticket es la escritura, cubierto por el test de abajo.
  it.skipIf(!hasCredentials)('el admin de la Store A NO puede actualizar el stock de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('product_stock')
      .update({ quantity: 999 })
      .eq('id', storeB.stockId)
      .select('id');

    // RLS bloquea silenciosamente (0 filas afectadas), no tira error.
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from('product_stock')
      .select('quantity')
      .eq('id', storeB.stockId)
      .single();
    expect(Number(unchanged?.quantity)).toBe(10);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO ve el stock_movement_log de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('stock_movement_log')
      .select('id')
      .eq('id', storeB.logId)
      .maybeSingle();

    expect(data).toBeNull();
  });
});
