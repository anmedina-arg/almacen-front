import { spawnSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Spec #179, ticket #189: el Costo vive solo en `product_costs`. Las columnas viejas de products
// (`cost`, `max_stock` y la categoría legacy de texto libre `categories`) ya no existen, y nada
// nombra esas columnas. Lo que antes colgaba de `products.cost` (historial de precios y costo de
// los ítems de pedido) ahora cuelga de `product_costs` y se comporta igual.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);
const dbUrl = process.env.TEST_DB_URL;
const psql = process.env.PSQL_PATH ?? 'psql';
const canRunPsql = Boolean(dbUrl) && spawnSync(psql, ['--version'], { encoding: 'utf8' }).status === 0;

function query(sql: string): string[] {
  const run = spawnSync(psql, [dbUrl as string, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
  expect(run.status, run.stderr).toBe(0);
  return run.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

describe.skipIf(!canRunPsql)('products sin las columnas viejas (#189)', () => {
  it('cost, max_stock y categories ya no existen en products', () => {
    const columns = query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name IN ('cost','max_stock','categories')"
    );
    expect(columns).toEqual([]);
  });

  it('ninguna función de public nombra esas columnas de products', () => {
    // `p.` / `products.` son los alias con los que el repo accede a products; ps.max_stock
    // (product_stock) y pc.cost (product_costs) son las columnas nuevas y no coinciden.
    const offenders = query(
      `SELECT p.proname FROM pg_proc p
       WHERE p.pronamespace = 'public'::regnamespace AND p.prokind IN ('f','p')
         AND regexp_replace(pg_get_functiondef(p.oid), '--[^\\n\\r]*', '', 'g') ~ '\\m(p|products)\\.(cost|max_stock|categories)\\M'
       ORDER BY 1`
    );
    expect(offenders).toEqual([]);
  });

  it('el espejo del costo ya no existe', () => {
    expect(query("SELECT proname FROM pg_proc WHERE proname = 'sync_product_cost_mirror'")).toEqual([]);
  });

  it('los triggers del costo cuelgan de product_costs, no de products', () => {
    const onProducts = query(
      "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.products'::regclass AND NOT tgisinternal ORDER BY 1"
    );
    expect(onProducts).not.toContain('trg_sync_order_items_cost');
    const onCosts = query(
      "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.product_costs'::regclass AND NOT tgisinternal ORDER BY 1"
    );
    expect(onCosts).toEqual(expect.arrayContaining(['trg_log_cost_change', 'trg_sync_order_items_cost']));
    expect(onCosts).not.toContain('trg_sync_product_cost_mirror');
  });
});

describe.skipIf(!hasCredentials)('lo que colgaba de products.cost, ahora de product_costs (#189)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  let storeId: number;
  const productIds: number[] = [];

  async function createProduct(name: string, price = 100): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `${name}-${tag}`, price, image: '', store_id: storeId, active: true })
      .select('id')
      .single();
    expect(error).toBeNull();
    productIds.push(data!.id);
    return data!.id;
  }

  const history = async (productId: number) =>
    (await admin.from('product_price_history').select('sale_price, cost').eq('product_id', productId).order('id'))
      .data!.map((r) => ({ price: Number(r.sale_price), cost: Number(r.cost) }));

  beforeAll(async () => {
    const { data, error } = await admin
      .from('stores')
      .insert({ slug: `cost-single-${tag}`, name: 'cost-single', feature_flags: { costos: true } })
      .select('id')
      .single();
    expect(error).toBeNull();
    storeId = data!.id;
  });

  afterAll(async () => {
    const { data: orders } = await admin.from('orders').select('id').eq('store_id', storeId);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length > 0) {
      await admin.from('order_items').delete().in('order_id', orderIds);
      await admin.from('orders').delete().in('id', orderIds);
    }
    if (productIds.length > 0) {
      await admin.from('product_costs').delete().in('product_id', productIds);
      await admin.from('product_price_history').delete().in('product_id', productIds);
      await admin.from('products').delete().in('id', productIds);
    }
    await admin.from('stores').delete().eq('id', storeId);
  });

  describe('historial de precios', () => {
    it('un producto nuevo se registra con costo 0; cargar el costo suma un registro', async () => {
      const id = await createProduct('hist-alta', 100);
      expect(await history(id)).toEqual([{ price: 100, cost: 0 }]);

      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 40 });
      expect(await history(id)).toEqual([
        { price: 100, cost: 0 },
        { price: 100, cost: 40 },
      ]);
    });

    it('cambiar el costo suma un registro y repetir el mismo costo no', async () => {
      const id = await createProduct('hist-cambio', 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 40 });
      await admin.from('product_costs').update({ cost: 55 }).eq('product_id', id);
      await admin.from('product_costs').update({ cost: 55 }).eq('product_id', id);
      expect((await history(id)).map((h) => h.cost)).toEqual([0, 40, 55]);
    });

    it('cambiar el precio registra el costo vigente; cambiar otro dato no registra nada', async () => {
      const id = await createProduct('hist-precio', 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 30 });
      await admin.from('products').update({ price: 150 }).eq('id', id);
      await admin.from('products').update({ name: `renombrado-${tag}` }).eq('id', id);
      expect(await history(id)).toEqual([
        { price: 100, cost: 0 },
        { price: 100, cost: 30 },
        { price: 150, cost: 30 },
      ]);
    });

    it('quitar el costo se registra como 0', async () => {
      const id = await createProduct('hist-quitar', 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 30 });
      await admin.from('product_costs').delete().eq('product_id', id);
      expect((await history(id)).map((h) => h.cost)).toEqual([0, 30, 0]);
    });

    it('borrar un producto con costo no falla (el costo se borra en cascada)', async () => {
      const id = await createProduct('hist-borrar', 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 30 });
      const { error } = await admin.from('products').delete().eq('id', id);
      expect(error).toBeNull();
      expect((await admin.from('product_costs').select('product_id').eq('product_id', id)).data).toEqual([]);
    });
  });

  describe('costo en los ítems de pedido', () => {
    async function orderWithItem(productId: number, unitPrice: number): Promise<number> {
      const { data, error } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: null,
        p_whatsapp_message: null,
        // Sin unit_cost, como lo manda la capa de servicios desde #189: lo fija la base.
        p_items: [{ product_id: productId, product_name: 'x', quantity: 1, unit_price: unitPrice, is_by_weight: false }],
        p_store_id: storeId,
      });
      expect(error).toBeNull();
      const { data: item } = await admin.from('order_items').select('id').eq('order_id', data.order_id).single();
      return item!.id;
    }
    const unitCostOf = async (itemId: number) =>
      Number((await admin.from('order_items').select('unit_cost').eq('id', itemId).single()).data!.unit_cost);

    it('al crear un ítem sin costo toma el de product_costs normalizado por el precio', async () => {
      const id = await createProduct('items-snapshot', 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 45 });
      // Un ítem a mitad de precio (promo) lleva la misma proporción de costo.
      expect(await unitCostOf(await orderWithItem(id, 100))).toBe(45);
      expect(await unitCostOf(await orderWithItem(id, 50))).toBe(22.5);
    });

    it('sin costo registrado el ítem queda con costo 0', async () => {
      const id = await createProduct('items-sin-costo', 100);
      expect(await unitCostOf(await orderWithItem(id, 100))).toBe(0);
    });

    it('cargar el costo después corrige los ítems sin costo, normalizado por el precio', async () => {
      const id = await createProduct('items-corrige', 100);
      const item = await orderWithItem(id, 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 60 });
      expect(await unitCostOf(item)).toBe(60);
    });

    it('un ítem que ya tiene costo capturado no se toca cuando el costo cambia', async () => {
      const id = await createProduct('items-historico', 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 45 });
      const item = await orderWithItem(id, 100);
      await admin.from('product_costs').update({ cost: 70 }).eq('product_id', id);
      expect(await unitCostOf(item)).toBe(45);
    });

    it('un costo en cero no corrige nada', async () => {
      const id = await createProduct('items-cero', 100);
      const item = await orderWithItem(id, 100);
      await admin.from('product_costs').insert({ product_id: id, store_id: storeId, cost: 0 });
      expect(await unitCostOf(item)).toBe(0);
    });
  });
});

describe.skipIf(!hasCredentials)('las RPC de reportes leen el costo de product_costs (#189)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  let storeId: number;
  let userId: string;
  let client: SupabaseClient;
  let conCosto: number;
  let sinCosto: number;
  const today = new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug: `cost-rpc-${tag}`, name: 'cost-rpc', feature_flags: { costos: true, stock: true } })
      .select('id')
      .single();
    expect(error).toBeNull();
    storeId = store!.id;

    const email = `__test_cost_rpc_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: auth } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    userId = auth!.user!.id;
    await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    await admin.from('store_admins').insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    const mk = async (name: string) => {
      const { data } = await admin.from('products').insert({ name: `${name}-${tag}`, price: 100, image: '', store_id: storeId, active: true }).select('id').single();
      return data!.id as number;
    };
    conCosto = await mk('con-costo');
    sinCosto = await mk('sin-costo');
    await admin.from('product_costs').insert({ product_id: conCosto, store_id: storeId, cost: 40 });
    for (const id of [conCosto, sinCosto]) {
      await admin.from('product_stock').insert({ product_id: id, quantity: 5, store_id: storeId, updated_by: userId });
      const { error: orderError } = await admin.rpc('create_order', {
        p_user_id: null, p_notes: null, p_whatsapp_message: null, p_store_id: storeId,
        p_items: [{ product_id: id, product_name: 'x', quantity: 2, unit_price: 100, is_by_weight: false }],
      });
      expect(orderError).toBeNull();
    }
  });

  afterAll(async () => {
    const { data: orders } = await admin.from('orders').select('id').eq('store_id', storeId);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length > 0) {
      await admin.from('order_items').delete().in('order_id', orderIds);
      await admin.from('orders').delete().in('id', orderIds);
    }
    const ids = [conCosto, sinCosto];
    await admin.from('stock_movement_log').delete().in('product_id', ids);
    await admin.from('product_stock').delete().in('product_id', ids);
    await admin.from('product_costs').delete().in('product_id', ids);
    await admin.from('product_price_history').delete().in('product_id', ids);
    await admin.from('products').delete().in('id', ids);
    await admin.from('store_admins').delete().eq('store_id', storeId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it('export_productos: costo y margen salen de product_costs; sin costo es 0 y sin margen porcentual', async () => {
    const { data, error } = await client.rpc('export_productos', { p_store_id: storeId });
    expect(error).toBeNull();
    const rows = data as { producto_id: number; costo: number; margen: number; margen_pct: number | null }[];
    const a = rows.find((r) => r.producto_id === conCosto)!;
    expect([Number(a.costo), Number(a.margen), Number(a.margen_pct)]).toEqual([40, 60, 150]);
    const b = rows.find((r) => r.producto_id === sinCosto)!;
    expect([Number(b.costo), Number(b.margen), b.margen_pct]).toEqual([0, 100, null]);
  });

  it('get_top_products: costo y margen actuales salen de product_costs', async () => {
    const { data, error } = await client.rpc('get_top_products', { p_store_id: storeId, p_limit: 10 });
    expect(error).toBeNull();
    const rows = data as { product_id: number; current_cost: number; margin: number; margin_pct: number | null }[];
    const a = rows.find((r) => r.product_id === conCosto)!;
    expect([Number(a.current_cost), Number(a.margin), Number(a.margin_pct)]).toEqual([40, 60, 150]);
    const b = rows.find((r) => r.product_id === sinCosto)!;
    expect([Number(b.current_cost), b.margin_pct]).toEqual([0, null]);
  });

  it('get_stock_value_per_day: valora el stock al costo de product_costs, y solo con el módulo costos', async () => {
    const call = () => client.rpc('get_stock_value_per_day', { p_store_id: storeId, p_start_date: today, p_end_date: today });

    const on = await call();
    expect(on.error).toBeNull();
    // Quedan 3 unidades (5 menos las 2 del pedido) a 40 = 120; el producto sin costo no suma.
    expect((on.data as { total_value: number }[]).map((r) => Number(r.total_value))).toEqual([120]);

    await admin.from('stores').update({ feature_flags: { costos: false, stock: true } }).eq('id', storeId);
    const off = await call();
    expect(off.error).toBeNull();
    expect(off.data).toEqual([]);
    await admin.from('stores').update({ feature_flags: { costos: true, stock: true } }).eq('id', storeId);
  });
});
