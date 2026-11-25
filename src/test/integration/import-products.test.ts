import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Spec #179, ticket #185: la Importación masiva crea los Productos válidos (y
// las categorías y subcategorías nuevas confirmadas) en UNA transacción, con
// la sesión del Store admin: todas o ninguna, y solo en su propia Store.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type Fixture = { storeId: number; userId: string; client: SupabaseClient };

const row = (overrides: Record<string, unknown> = {}) => ({
  name: 'Producto',
  category_name: 'Gaseosas',
  subcategory_name: null,
  sale_type: 'unit',
  price: 1000,
  image: '/producto-sin-imagen.svg',
  active: true,
  ...overrides,
});

describe.skipIf(!hasCredentials)('import_products — creación transaccional de la Importación masiva (#185)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  let storeA: Fixture;
  let storeB: Fixture;
  let outsider: Fixture; // usuario autenticado que no administra ninguna Store

  async function createUser(): Promise<{ userId: string; client: SupabaseClient }> {
    const email = `__test_import_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(error).toBeNull();
    const userId = data!.user!.id;
    // Mismo motivo que store-scoping-products: el trigger handle_new_user no existe en la base local.
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();
    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    return { userId, client };
  }

  async function createStore(slug: string, withAdmin: boolean): Promise<Fixture> {
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug: `${slug}-${tag}`, name: slug, feature_flags: {} })
      .select('id')
      .single();
    expect(error).toBeNull();
    const { userId, client } = await createUser();
    if (withAdmin) {
      const { error: membershipError } = await admin
        .from('store_admins')
        .insert({ profile_id: userId, store_id: store!.id, role: 'admin' });
      expect(membershipError).toBeNull();
    }
    return { storeId: store!.id, userId, client };
  }

  async function deleteFixture(fixture: Fixture) {
    const { data: products } = await admin.from('products').select('id').eq('store_id', fixture.storeId);
    const ids = (products ?? []).map((p) => p.id);
    if (ids.length > 0) await admin.from('product_price_history').delete().in('product_id', ids);
    await admin.from('products').delete().eq('store_id', fixture.storeId);
    await admin.from('subcategories').delete().eq('store_id', fixture.storeId);
    await admin.from('categories').delete().eq('store_id', fixture.storeId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  const counts = async (storeId: number) => {
    const [products, categories, subcategories] = await Promise.all([
      admin.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
      admin.from('categories').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
      admin.from('subcategories').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    ]);
    return { products: products.count, categories: categories.count, subcategories: subcategories.count };
  };

  beforeAll(async () => {
    storeA = await createStore('import-a', true);
    storeB = await createStore('import-b', true);
    outsider = await createStore('import-c', false);
  });

  afterAll(async () => {
    for (const fixture of [storeA, storeB, outsider]) if (fixture) await deleteFixture(fixture);
  });

  it('crea los productos con las categorías y subcategorías nuevas, y reporta cuántos creó', async () => {
    const { data, error } = await storeA.client.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [
        row({ name: 'Coca', category_name: 'Gaseosas', subcategory_name: 'Cola', price: 3500.5, active: false, sale_type: 'kg' }),
        row({ name: 'Sprite', category_name: 'Gaseosas', subcategory_name: 'Cola' }),
        row({ name: 'Papas', category_name: 'Snacks' }),
      ],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ products_created: 3, categories_created: 2, subcategories_created: 1 });

    const { data: products } = await admin
      .from('products')
      .select('name, price, active, sale_type, image, category_id, subcategory_id, store_id')
      .eq('store_id', storeA.storeId)
      .order('name');
    expect(products).toHaveLength(3);
    const coca = products!.find((p) => p.name === 'Coca')!;
    expect(coca).toMatchObject({ price: 3500.5, active: false, sale_type: 'kg', image: '/producto-sin-imagen.svg' });
    expect(coca.subcategory_id).not.toBeNull();
    expect(products!.find((p) => p.name === 'Papas')!.subcategory_id).toBeNull();
    // Una sola categoría Gaseosas aunque dos filas la usan.
    expect(await counts(storeA.storeId)).toEqual({ products: 3, categories: 2, subcategories: 1 });
  });

  it('usa la categoría y la subcategoría que ya existen, sin duplicarlas', async () => {
    const { data, error } = await storeA.client.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [row({ name: 'Fanta', category_name: 'Gaseosas', subcategory_name: 'Cola' })],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ products_created: 1, categories_created: 0, subcategories_created: 0 });
    expect(await counts(storeA.storeId)).toEqual({ products: 4, categories: 2, subcategories: 1 });
  });

  it('las categorías nuevas quedan al final de la lista de la Store', async () => {
    await storeA.client.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [row({ name: 'Alfajor', category_name: 'Golosinas' })],
    });
    const { data } = await admin.from('categories').select('name, sort_order').eq('store_id', storeA.storeId);
    const golosinas = data!.find((c) => c.name === 'Golosinas')!;
    const maxOther = Math.max(...data!.filter((c) => c.name !== 'Golosinas').map((c) => c.sort_order));
    expect(golosinas.sort_order).toBe(maxOther + 1);
  });

  it('todas o ninguna: si una fila falla no se crea nada, ni las categorías de las filas anteriores', async () => {
    const before = await counts(storeA.storeId);
    const { error } = await storeA.client.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [
        row({ name: 'Buena 1', category_name: 'Categoria nueva', subcategory_name: 'Sub nueva' }),
        row({ name: 'Buena 2', category_name: 'Categoria nueva' }),
        row({ name: 'Mala', category_name: 'Categoria nueva', sale_type: 'litro' }), // viola products_sale_type_check
      ],
    });
    expect(error?.code).toBe('23514'); // products_sale_type_check
    expect(await counts(storeA.storeId)).toEqual(before);
  });

  it('rechaza más de 500 filas y no crea nada', async () => {
    const before = await counts(storeA.storeId);
    const rows = Array.from({ length: 501 }, (_, i) => row({ name: `Masivo ${i}` }));
    const { error } = await storeA.client.rpc('import_products', { p_store_id: storeA.storeId, p_rows: rows });
    expect(error?.message).toContain('500 filas');
    expect(await counts(storeA.storeId)).toEqual(before);
  });

  it('aislamiento: el admin de una Store no puede crear productos en otra', async () => {
    const before = await counts(storeB.storeId);
    const { error } = await storeA.client.rpc('import_products', {
      p_store_id: storeB.storeId,
      p_rows: [row({ name: 'Intruso', category_name: 'Hackeada' })],
    });
    expect(error?.code).toBe('42501');
    expect(await counts(storeB.storeId)).toEqual(before);
  });

  it('un usuario autenticado que no es admin de la Store no puede importar', async () => {
    const { error } = await outsider.client.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [row({ name: 'Intruso 2' })],
    });
    expect(error?.code).toBe('42501');
    const { count } = await admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeA.storeId)
      .eq('name', 'Intruso 2');
    expect(count).toBe(0);
  });

  it('sin active ni sale_type en la fila, el producto queda activo y por unidad', async () => {
    const { error } = await storeA.client.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [{ name: 'Con defaults', category_name: 'Gaseosas', price: 10, image: '/producto-sin-imagen.svg' }],
    });
    expect(error).toBeNull();
    const { data } = await admin
      .from('products')
      .select('active, sale_type, subcategory_id')
      .eq('store_id', storeA.storeId)
      .eq('name', 'Con defaults')
      .single();
    expect(data).toEqual({ active: true, sale_type: 'unit', subcategory_id: null });
  });

  it('un visitante anónimo no puede invocar la RPC', async () => {
    const anon = createClient(url ?? '', anonKey ?? '');
    const { error } = await anon.rpc('import_products', {
      p_store_id: storeA.storeId,
      p_rows: [row({ name: 'Anonimo' })],
    });
    expect(error?.code).toBe('42501'); // permission denied for function: sin EXECUTE para anon
  });
});
