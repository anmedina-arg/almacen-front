import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { confirmImport, previewImport } from '@/features/products/services/importPreviewService';

// Spec #179, ticket #188: la Importación masiva carga las columnas de los módulos de la
// Store. El costo va a la tabla de costos y el stock inicial al stock del producto
// (`product_stock`), cada uno solo si la Store tiene su módulo. Con el módulo apagado la
// columna se ignora y la vista previa lo avisa. Todo ocurre en la misma transacción que el
// alta del producto: si algo falla no queda ni el producto, ni su costo, ni su stock.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type Fixture = { storeId: number; userId: string; client: SupabaseClient };

describe.skipIf(!hasCredentials)('importación masiva — columnas de módulos (#188)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  const fixtures: Fixture[] = [];

  async function createStore(slug: string, flags: Record<string, boolean>): Promise<Fixture> {
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug: `${slug}-${tag}`, name: slug, feature_flags: flags })
      .select('id')
      .single();
    expect(error).toBeNull();

    const email = `__test_import_modules_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: auth, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(authError).toBeNull();
    const userId = auth!.user!.id;
    await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    await admin.from('store_admins').insert({ profile_id: userId, store_id: store!.id, role: 'admin' });
    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    const fixture = { storeId: store!.id as number, userId, client };
    fixtures.push(fixture);
    return fixture;
  }

  const csv = (...lines: string[]) => ({ buffer: Buffer.from(lines.join('\r\n') + '\r\n', 'utf8'), filename: 'productos.csv' });
  const HEADER = 'nombre;categoría;precio;costo;stock_inicial';
  const confirm = { includeDuplicateRows: [], confirmNewCategories: true };

  const productId = async (storeId: number, name: string) =>
    (await admin.from('products').select('id').eq('store_id', storeId).eq('name', name).single()).data!.id as number;
  const costOf = async (id: number) =>
    (await admin.from('product_costs').select('cost').eq('product_id', id)).data!.map((r) => Number(r.cost));
  const stockOf = async (id: number) =>
    (await admin.from('product_stock').select('quantity, max_stock').eq('product_id', id)).data!.map((r) => ({
      quantity: Number(r.quantity),
      max_stock: r.max_stock,
    }));

  afterAll(async () => {
    for (const f of fixtures) {
      const { data: products } = await admin.from('products').select('id').eq('store_id', f.storeId);
      const ids = (products ?? []).map((p) => p.id);
      if (ids.length > 0) {
        await admin.from('stock_movement_log').delete().in('product_id', ids);
        await admin.from('product_stock').delete().in('product_id', ids);
        await admin.from('product_costs').delete().in('product_id', ids);
        await admin.from('product_price_history').delete().in('product_id', ids);
      }
      await admin.from('products').delete().eq('store_id', f.storeId);
      await admin.from('subcategories').delete().eq('store_id', f.storeId);
      await admin.from('categories').delete().eq('store_id', f.storeId);
      await admin.from('store_admins').delete().eq('store_id', f.storeId);
      await admin.from('profiles').delete().eq('id', f.userId);
      await admin.auth.admin.deleteUser(f.userId);
      await admin.from('stores').delete().eq('id', f.storeId);
    }
  });

  it('con costos y stock: guarda el costo en product_costs y el stock inicial en product_stock', async () => {
    const store = await createStore('imp-ambos', { costos: true, stock: true });
    const result = await confirmImport(
      store.client,
      store.storeId,
      csv(HEADER, 'Con todo;Snacks;100;12,5;4', 'Costo cero;Snacks;100;0;0', 'Sin nada;Snacks;100;;'),
      confirm,
      { costos: true, stock: true }
    );
    expect(result.productsCreated).toBe(3);

    const conTodo = await productId(store.storeId, 'Con todo');
    expect(await costOf(conTodo)).toEqual([12.5]);
    expect(await stockOf(conTodo)).toEqual([{ quantity: 4, max_stock: null }]);
    // El stock inicial es una carga inicial: queda en el historial de movimientos.
    const log = await admin.from('stock_movement_log').select('movement_type, new_qty').eq('product_id', conTodo);
    expect(log.data).toEqual([{ movement_type: 'initial_count', new_qty: 4 }]);

    // Un cero escrito a propósito se registra; una celda vacía no registra nada.
    const costoCero = await productId(store.storeId, 'Costo cero');
    expect(await costOf(costoCero)).toEqual([0]);
    expect(await stockOf(costoCero)).toEqual([{ quantity: 0, max_stock: null }]);
    const sinNada = await productId(store.storeId, 'Sin nada');
    expect(await costOf(sinNada)).toEqual([]);
    expect(await stockOf(sinNada)).toEqual([]);
  });

  it.each([
    ['solo costos', { costos: true, stock: false }, { cost: [7], stock: [] }],
    ['solo stock', { costos: false, stock: true }, { cost: [], stock: [{ quantity: 9, max_stock: null }] }],
    ['ninguno', { costos: false, stock: false }, { cost: [], stock: [] }],
  ])('%s: cada módulo carga solo lo suyo y la otra columna se ignora', async (label, modules, expected) => {
    const store = await createStore(`imp-${label.replace(/\W/g, '')}`, modules);
    const file = csv(HEADER, 'Producto;Snacks;100;7;9');

    const preview = await previewImport(store.client, store.storeId, file, modules);
    const ignored = preview.ignoredColumns.map((c) => c.name);
    expect(ignored.includes('costo')).toBe(!modules.costos);
    expect(ignored.includes('stock_inicial')).toBe(!modules.stock);
    expect(preview.counts.error).toBe(0);

    await confirmImport(store.client, store.storeId, file, confirm, modules);
    const id = await productId(store.storeId, 'Producto');
    expect(await costOf(id)).toEqual(expected.cost);
    expect(await stockOf(id)).toEqual(expected.stock);
  });

  it('la base también respeta las flags: sin módulo, una fila con costo y stock no los guarda', async () => {
    const store = await createStore('imp-rpc-off', { costos: false, stock: false });
    const { error } = await store.client.rpc('import_products', {
      p_store_id: store.storeId,
      p_rows: [{ name: 'Directo', category_name: 'Snacks', price: 50, cost: 3, initial_stock: 8 }],
    });
    expect(error).toBeNull();
    const id = await productId(store.storeId, 'Directo');
    expect(await costOf(id)).toEqual([]);
    expect(await stockOf(id)).toEqual([]);
  });

  it('todas o ninguna: si una fila falla no queda ni el costo ni el stock de las anteriores', async () => {
    const store = await createStore('imp-atomico', { costos: true, stock: true });
    const { error } = await store.client.rpc('import_products', {
      p_store_id: store.storeId,
      p_rows: [
        { name: 'Buena', category_name: 'Snacks', price: 50, cost: 3, initial_stock: 8 },
        { name: 'Mala', category_name: 'Snacks', price: 50, cost: -1, initial_stock: 2 },
      ],
    });
    expect(error).not.toBeNull();
    expect((await admin.from('products').select('id').eq('store_id', store.storeId)).data).toEqual([]);
    expect((await admin.from('product_costs').select('product_id').eq('store_id', store.storeId)).data).toEqual([]);
    expect((await admin.from('product_stock').select('product_id').eq('store_id', store.storeId)).data).toEqual([]);
  });

  it('una fila con costo inválido es un error en la vista previa y no se crea', async () => {
    const store = await createStore('imp-error', { costos: true, stock: true });
    const file = csv(HEADER, 'Mala;Snacks;100;abc;1', 'Buena;Snacks;100;5;1');
    const preview = await previewImport(store.client, store.storeId, file, { costos: true, stock: true });
    expect(preview.counts).toMatchObject({ error: 1 });

    const result = await confirmImport(store.client, store.storeId, file, confirm, { costos: true, stock: true });
    expect(result).toMatchObject({ productsCreated: 1, skippedCount: 1 });
  });
});
