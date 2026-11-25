import { spawnSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProduct, updateProduct } from '@/features/products/services/productService';
import { listProductMaxStocks } from '@/features/products/services/productStockService';

// Spec #179, ticket #184 (ADR-0012): el máximo de stock deja de ser del Producto y pasa a ser
// un atributo del módulo `stock`, junto con el stock real (`product_stock.max_stock`). Combos y
// las RPC de stock lo leen de ahí. Con `stock` apagada el máximo no se guarda ni se devuelve, y
// apagarla no borra el que ya estaba cargado. La columna vieja (`products.max_stock`) se borra en #189.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);
const dbUrl = process.env.TEST_DB_URL;
const psql = process.env.PSQL_PATH ?? 'psql';
const canRunPsql = Boolean(dbUrl) && spawnSync(psql, ['--version'], { encoding: 'utf8' }).status === 0;

type Fixture = { storeId: number; categoryId: number; userId: string; client: SupabaseClient };

describe.skipIf(!hasCredentials)('máximo de stock dentro del módulo stock (#184)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  const fixtures: Fixture[] = [];
  const productIds: number[] = [];

  async function createFixture(slug: string, flags: Record<string, boolean>): Promise<Fixture> {
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug: `${slug}-${tag}`, name: slug, feature_flags: flags })
      .select('id')
      .single();
    expect(error).toBeNull();
    const { data: category } = await admin.from('categories').insert({ name: `cat-${slug}`, store_id: store!.id }).select('id').single();

    const email = `__test_max_stock_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: auth, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(authError).toBeNull();
    const userId = auth!.user!.id;
    await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    await admin.from('store_admins').insert({ profile_id: userId, store_id: store!.id, role: 'admin' });
    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    const fixture = { storeId: store!.id as number, categoryId: category!.id as number, userId, client };
    fixtures.push(fixture);
    return fixture;
  }

  const input = (categoryId: number, name: string, extra: Record<string, unknown> = {}) => ({
    name,
    price: 100,
    image: '',
    active: true,
    sale_type: 'unit' as const,
    is_combo: false,
    category_id: categoryId,
    is_producto_surtido: false,
    ...extra,
  });

  /** Producto común con stock propio, para usarlo de componente. */
  async function createComponent(f: Fixture, quantity: number): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `comp-${randomUUID().slice(0, 6)}`, price: 10, image: '', store_id: f.storeId, active: false })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    const { error: stockError } = await admin
      .from('product_stock')
      .insert({ product_id: data!.id, quantity, store_id: f.storeId, updated_by: f.userId });
    expect(stockError).toBeNull();
    return data!.id;
  }

  /** Combo armado directo (sin pasar por el servicio) con un componente de 1 unidad. */
  async function createCombo(f: Fixture, componentId: number, fields: Record<string, unknown> = {}): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `combo-${randomUUID().slice(0, 6)}`, price: 50, image: '', store_id: f.storeId, active: true, is_combo: true, ...fields })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    const { error: linkError } = await admin
      .from('combo_components')
      .insert({ combo_product_id: data!.id, component_product_id: componentId, quantity: 1, store_id: f.storeId });
    expect(linkError).toBeNull();
    return data!.id;
  }

  const stockRow = async (productId: number) =>
    (await admin.from('product_stock').select('quantity, max_stock').eq('product_id', productId)).data!.map((r) => ({
      quantity: Number(r.quantity),
      max_stock: r.max_stock === null ? null : Number(r.max_stock),
    }));
  // stock_movement_log exige performed_by: el trigger lo toma de updated_by.
  const setQuantity = async (productId: number, quantity: number, userId: string) => {
    const { error } = await admin.from('product_stock').update({ quantity, updated_by: userId }).eq('product_id', productId);
    expect(error).toBeNull();
  };
  const legacyColumn = async (productId: number) =>
    (await admin.from('products').select('max_stock').eq('id', productId).single()).data!.max_stock;

  afterAll(async () => {
    if (productIds.length > 0) {
      await admin.from('combo_components').delete().in('combo_product_id', productIds);
      await admin.from('stock_movement_log').delete().in('product_id', productIds);
      await admin.from('product_stock').delete().in('product_id', productIds);
      await admin.from('product_price_history').delete().in('product_id', productIds);
      await admin.from('products').delete().in('id', productIds);
    }
    for (const f of fixtures) {
      await admin.from('categories').delete().eq('store_id', f.storeId);
      await admin.from('store_admins').delete().eq('store_id', f.storeId);
      await admin.from('profiles').delete().eq('id', f.userId);
      await admin.auth.admin.deleteUser(f.userId);
      await admin.from('stores').delete().eq('id', f.storeId);
    }
  });

  describe('la tabla', () => {
    let store: Fixture;
    beforeAll(async () => {
      store = await createFixture('max-tabla', { stock: true });
    });

    it('rechaza un máximo negativo', async () => {
      const componentId = await createComponent(store, 5);
      const { error } = await admin.from('product_stock').update({ max_stock: -1 }).eq('product_id', componentId);
      expect(error?.code).toBe('23514');
    });

    it('cargar stock con upsert_product_stock no pisa el máximo', async () => {
      const componentId = await createComponent(store, 5);
      await admin.from('product_stock').update({ max_stock: 8 }).eq('product_id', componentId);
      const { error } = await store.client.rpc('upsert_product_stock', {
        p_product_id: componentId,
        p_quantity: 20,
        p_store_id: store.storeId,
      });
      expect(error).toBeNull();
      expect(await stockRow(componentId)).toEqual([{ quantity: 20, max_stock: 8 }]);
    });
  });

  describe('migración: copiar los máximos actuales desde products.max_stock', () => {
    let store: Fixture;
    beforeAll(async () => {
      store = await createFixture('max-migracion', { stock: true });
    });

    // La misma sentencia que se corre una vez en producción (ver product_stock.sql).
    const COPY_SQL = `INSERT INTO public.product_stock (product_id, store_id, quantity, max_stock)
      SELECT id, store_id, 0, max_stock FROM public.products WHERE max_stock IS NOT NULL
      ON CONFLICT (product_id) DO UPDATE SET max_stock = EXCLUDED.max_stock`;

    it.skipIf(!canRunPsql)('copia el máximo sin tocar el stock existente ni crear filas de más', async () => {
      const mk = async (name: string, max: number | null) => {
        const { data } = await admin
          .from('products')
          .insert({ name, price: 9, image: '', store_id: store.storeId, active: false, max_stock: max })
          .select('id')
          .single();
        productIds.push(data!.id);
        return data!.id as number;
      };
      const conFila = await mk('con fila de stock', 5);
      const sinFila = await mk('sin fila de stock', 3);
      const sinMaximo = await mk('sin máximo', null);
      await admin.from('product_stock').insert({ product_id: conFila, quantity: 7, store_id: store.storeId, updated_by: store.userId });

      const run = spawnSync(psql, [dbUrl as string, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', COPY_SQL], { encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);

      expect(await stockRow(conFila)).toEqual([{ quantity: 7, max_stock: 5 }]);
      expect(await stockRow(sinFila)).toEqual([{ quantity: 0, max_stock: 3 }]);
      expect(await stockRow(sinMaximo)).toEqual([]);

      // Correrla de nuevo no duplica ni cambia nada.
      const again = spawnSync(psql, [dbUrl as string, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', COPY_SQL], { encoding: 'utf8' });
      expect(again.status, again.stderr).toBe(0);
      expect(await stockRow(conFila)).toEqual([{ quantity: 7, max_stock: 5 }]);
      expect(await stockRow(sinFila)).toEqual([{ quantity: 0, max_stock: 3 }]);
    });
  });

  describe('las RPC de stock leen el máximo de product_stock', () => {
    let store: Fixture;
    beforeAll(async () => {
      store = await createFixture('max-rpc', { stock: true });
    });

    const rowOf = async (productId: number) => {
      const { data, error } = await store.client.rpc('get_all_products_with_stock', { p_store_id: store.storeId });
      expect(error).toBeNull();
      return (data as { product_id: number; quantity: number }[]).find((r) => r.product_id === productId)!;
    };
    const exportOf = async (productId: number) => {
      const { data, error } = await store.client.rpc('export_productos', { p_store_id: store.storeId });
      expect(error).toBeNull();
      return (data as { producto_id: number; stock_actual: number }[]).find((r) => r.producto_id === productId)!;
    };

    it('un combo con máximo en product_stock queda acotado en /admin/stock y en el CSV', async () => {
      const component = await createComponent(store, 10);
      const combo = await createCombo(store, component);
      await admin.from('product_stock').insert({ product_id: combo, quantity: 0, max_stock: 4, store_id: store.storeId });

      expect(Number((await rowOf(combo)).quantity)).toBe(4);
      expect(Number((await exportOf(combo)).stock_actual)).toBe(4);
    });

    it('un máximo mayor que lo que alcanza no cambia el Disponible', async () => {
      const component = await createComponent(store, 10);
      const combo = await createCombo(store, component);
      await admin.from('product_stock').insert({ product_id: combo, quantity: 0, max_stock: 50, store_id: store.storeId });

      expect(Number((await rowOf(combo)).quantity)).toBe(10);
      expect(Number((await exportOf(combo)).stock_actual)).toBe(10);
    });

    it('un combo sin máximo no tiene tope', async () => {
      const component = await createComponent(store, 10);
      const combo = await createCombo(store, component);
      expect(Number((await rowOf(combo)).quantity)).toBe(10);
    });

    it('la columna vieja de products ya no se lee', async () => {
      const component = await createComponent(store, 10);
      const combo = await createCombo(store, component, { max_stock: 2 });
      expect(Number((await rowOf(combo)).quantity)).toBe(10);
      expect(Number((await exportOf(combo)).stock_actual)).toBe(10);
    });

    it('la fila de un combo con cantidad 0 no cambia su Disponible en el catálogo', async () => {
      const component = await createComponent(store, 6);
      const combo = await createCombo(store, component);
      await admin.from('product_stock').insert({ product_id: combo, quantity: 0, max_stock: 2, store_id: store.storeId });

      const { data, error } = await admin.rpc('get_available_stock', { p_store_id: store.storeId, p_product_ids: [combo] });
      expect(error).toBeNull();
      expect(Number(data![0].available)).toBe(6); // el máximo no entra en el Disponible (#159)
    });
  });

  describe('stock encendida: el servicio guarda el máximo en product_stock', () => {
    let store: Fixture;
    const on = { costsEnabled: false, stockEnabled: true };
    beforeAll(async () => {
      store = await createFixture('max-on', { stock: true });
    });

    it('crear con máximo lo guarda en product_stock, lo devuelve y no escribe la columna vieja', async () => {
      const component = await createComponent(store, 10);
      const product = await createProduct(
        admin,
        store.storeId,
        input(store.categoryId, 'combo con tope', { is_combo: true, max_stock: 6, components: [{ component_product_id: component, quantity: 1 }] }),
        on
      );
      productIds.push(product.id);
      expect(product.max_stock).toBe(6);
      expect(await stockRow(product.id)).toEqual([{ quantity: 0, max_stock: 6 }]);
      expect(await legacyColumn(product.id)).toBeNull();
    });

    it('crear sin máximo no crea fila de stock', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'sin tope'), on);
      productIds.push(product.id);
      expect(product.max_stock ?? null).toBeNull();
      expect(await stockRow(product.id)).toEqual([]);
    });

    it('editar el máximo lo cambia sin tocar la cantidad, y null lo quita sin borrar el stock', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'editable', { max_stock: 5 }), on);
      productIds.push(product.id);
      await setQuantity(product.id, 12, store.userId);

      const changed = await updateProduct(admin, store.storeId, product.id, { max_stock: 9 }, on);
      expect(changed.max_stock).toBe(9);
      expect(changed.name).toBe('editable');
      expect(await stockRow(product.id)).toEqual([{ quantity: 12, max_stock: 9 }]);

      const cleared = await updateProduct(admin, store.storeId, product.id, { max_stock: null }, on);
      expect(cleared.max_stock ?? null).toBeNull();
      expect(await stockRow(product.id)).toEqual([{ quantity: 12, max_stock: null }]);
    });

    it('quitar el máximo de un producto sin fila de stock no crea una fila', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'sin fila'), on);
      productIds.push(product.id);
      await updateProduct(admin, store.storeId, product.id, { max_stock: null }, on);
      expect(await stockRow(product.id)).toEqual([]);
    });

    it('editar otro dato no toca el máximo', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'solo precio', { max_stock: 3 }), on);
      productIds.push(product.id);
      const updated = await updateProduct(admin, store.storeId, product.id, { price: 321 }, on);
      expect(updated.price).toBe(321);
      expect(await stockRow(product.id)).toEqual([{ quantity: 0, max_stock: 3 }]);
    });

    it('listProductMaxStocks trae solo los productos con máximo de esa Store', async () => {
      const maxes = await listProductMaxStocks(admin, store.storeId);
      expect([...maxes.values()]).toContain(6);
      const sinTope = (await admin.from('products').select('id').eq('store_id', store.storeId).eq('name', 'sin tope').single()).data!.id;
      expect(maxes.has(sinTope)).toBe(false);
    });
  });

  describe('stock apagada: el máximo ni se guarda ni se devuelve, y apagarla no borra nada', () => {
    let store: Fixture;
    const off = { costsEnabled: false, stockEnabled: false };
    beforeAll(async () => {
      store = await createFixture('max-off', { stock: false });
    });

    it('crear y editar con máximo lo ignoran: ni fila, ni columna vieja, ni respuesta', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'sin módulo', { max_stock: 7 }), off);
      productIds.push(product.id);
      expect(product.max_stock ?? null).toBeNull();
      expect(await stockRow(product.id)).toEqual([]);
      expect(await legacyColumn(product.id)).toBeNull();

      const updated = await updateProduct(admin, store.storeId, product.id, { max_stock: 9, price: 55 }, off);
      expect(updated.price).toBe(55); // el resto de la edición sigue funcionando
      expect(updated.max_stock ?? null).toBeNull();
      expect(await stockRow(product.id)).toEqual([]);
    });

    it('sin indicación de flag el servicio tampoco escribe el máximo (falla cerrado)', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'default', { max_stock: 7 }));
      productIds.push(product.id);
      expect(await stockRow(product.id)).toEqual([]);
    });

    it('apagar la flag con máximo y stock ya cargados no los borra', async () => {
      const onStore = await createFixture('max-toggle', { stock: true });
      const product = await createProduct(admin, onStore.storeId, input(onStore.categoryId, 'persiste', { max_stock: 4 }), {
        costsEnabled: false,
        stockEnabled: true,
      });
      productIds.push(product.id);
      await setQuantity(product.id, 9, onStore.userId);

      await admin.from('stores').update({ feature_flags: { stock: false } }).eq('id', onStore.storeId);
      await updateProduct(admin, onStore.storeId, product.id, { price: 77 }, off);
      expect(await stockRow(product.id)).toEqual([{ quantity: 9, max_stock: 4 }]);

      await admin.from('stores').update({ feature_flags: { stock: true } }).eq('id', onStore.storeId);
      const maxes = await listProductMaxStocks(admin, onStore.storeId);
      expect(maxes.get(product.id)).toBe(4);
    });
  });

  // ADR-0012: `stock` y `costos` son independientes. Productos y combos se crean y editan igual
  // en las cuatro combinaciones; solo el máximo depende de `stock`.
  describe.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])('independencia de flags (stock=%s, costos=%s)', (stock, costos) => {
    it('crear y editar un producto y un combo funciona; el máximo sigue solo la flag stock', async () => {
      const store = await createFixture(`max-ind-${stock ? 's' : 'x'}${costos ? 'c' : 'x'}`, { stock, costos });
      const options = { costsEnabled: costos, stockEnabled: stock };
      const component = await createComponent(store, 5);

      const plain = await createProduct(admin, store.storeId, input(store.categoryId, 'plano', { cost: 3 }), options);
      productIds.push(plain.id);
      const combo = await createProduct(
        admin,
        store.storeId,
        input(store.categoryId, 'combo', { is_combo: true, max_stock: 2, components: [{ component_product_id: component, quantity: 1 }] }),
        options
      );
      productIds.push(combo.id);
      expect(combo.is_combo).toBe(true);
      expect(await stockRow(combo.id)).toEqual(stock ? [{ quantity: 0, max_stock: 2 }] : []);

      const edited = await updateProduct(admin, store.storeId, plain.id, { price: 250 }, options);
      expect(edited.price).toBe(250);
    });
  });
});
