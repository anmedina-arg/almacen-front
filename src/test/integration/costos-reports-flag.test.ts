import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addOrderItem, createOrder, getOrderById, getOrders, updateOrderItem } from '@/features/orders/services/orderService';
import { getTopProducts } from '@/features/ranking/services/rankingService';
import { getPendingPayments } from '@/features/dashboard/services/dashboardService';
import { exportProductos, exportVentas } from '@/features/recomendaciones/services/reportsService';

// Spec #179, ticket #186 (ADR-0012 y ADR-0018): Costo y margen salen de las
// respuestas de Pedidos, Ranking e Informes solo con la flag `costos`, en las
// cuatro combinaciones con `stock`. Con la flag apagada la respuesta no los trae
// (no alcanza con ocultarlos en la pantalla) y todo lo demás sigue funcionando;
// encendida, un pedido sin costo registrado es "sin costo" y no infla el margen.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

interface Fixture {
  storeId: number;
  userId: string;
  client: SupabaseClient; // sesión del Store admin
  conCosto: number; // producto con costo registrado (precio 100, costo 60)
  sinCosto: number; // producto sin costo registrado (precio 80)
  pedidoCompleto: number;
  pedidoParcial: number;
  pedidoSinCosto: number;
}

const COMBINACIONES: [boolean, boolean][] = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
];

describe.skipIf(!hasCredentials)('flag costos — pedidos, ranking e informes (#186)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  const fixtures: Fixture[] = [];

  async function createFixture(costos: boolean, stock: boolean): Promise<Fixture> {
    const slug = `costos-rep-${costos ? 'c' : 'x'}${stock ? 's' : 'x'}-${tag}`;
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: { costos, stock } })
      .select('id')
      .single();
    expect(error).toBeNull();
    const storeId = store!.id as number;

    const email = `__test_costos_rep_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: auth } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    const userId = auth!.user!.id;
    await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    await admin.from('store_admins').insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    const { data: category } = await admin.from('categories').insert({ name: `cat-${slug}`, store_id: storeId }).select('id').single();
    const mk = async (name: string, price: number) =>
      (await admin.from('products').insert({ name, price, image: '', store_id: storeId, category_id: category!.id }).select('id').single()).data!.id as number;
    const conCosto = await mk('Con costo', 100);
    const sinCosto = await mk('Sin costo', 80);
    // Costo registrado solo para uno (product_costs es la única fuente del costo).
    await admin.from('product_costs').insert({ product_id: conCosto, store_id: storeId, cost: 60 });

    const item = (product_id: number, product_name: string, unit_price: number) => ({
      product_id, product_name, quantity: 2, unit_price, is_by_weight: false, from_suggestion: false,
    });
    const pedido = async (items: ReturnType<typeof item>[]) =>
      (await createOrder(client, storeId, { notes: undefined, whatsapp_message: '', items })).order_id;

    return {
      storeId,
      userId,
      client,
      conCosto,
      sinCosto,
      pedidoCompleto: await pedido([item(conCosto, 'Con costo', 100)]),
      pedidoParcial: await pedido([item(conCosto, 'Con costo', 100), item(sinCosto, 'Sin costo', 80)]),
      pedidoSinCosto: await pedido([item(sinCosto, 'Sin costo', 80)]),
    };
  }

  beforeAll(async () => {
    for (const [costos, stock] of COMBINACIONES) fixtures.push(await createFixture(costos, stock));
  });

  afterAll(async () => {
    for (const f of fixtures) {
      const { data: orders } = await admin.from('orders').select('id').eq('store_id', f.storeId);
      const orderIds = (orders ?? []).map((o) => o.id);
      if (orderIds.length > 0) {
        await admin.from('order_items').delete().in('order_id', orderIds);
        await admin.from('orders').delete().in('id', orderIds);
      }
      const { data: products } = await admin.from('products').select('id').eq('store_id', f.storeId);
      const ids = (products ?? []).map((p) => p.id);
      if (ids.length > 0) {
        await admin.from('product_costs').delete().in('product_id', ids);
        await admin.from('product_price_history').delete().in('product_id', ids);
        await admin.from('product_stock').delete().in('product_id', ids);
        await admin.from('stock_movement_log').delete().in('product_id', ids);
      }
      await admin.from('products').delete().eq('store_id', f.storeId);
      await admin.from('categories').delete().eq('store_id', f.storeId);
      await admin.from('store_admins').delete().eq('store_id', f.storeId);
      await admin.from('profiles').delete().eq('id', f.userId);
      await admin.auth.admin.deleteUser(f.userId);
      await admin.from('stores').delete().eq('id', f.storeId);
    }
  });

  describe.each(COMBINACIONES)('costos=%s, stock=%s', (costos, stock) => {
    const fx = () => fixtures[COMBINACIONES.findIndex(([c, s]) => c === costos && s === stock)];
    const opts = { costsEnabled: costos };

    it('Pedidos: la lista trae costo y margen solo con la flag encendida', async () => {
      const orders = await getOrders(fx().client, fx().storeId, opts);
      expect(orders).toHaveLength(3);
      for (const order of orders) {
        for (const key of ['total_cost', 'margin', 'margin_pct', 'cost_coverage']) {
          expect(key in order, `${key} con costos=${costos}`).toBe(costos);
        }
      }
    });

    it('Pedidos: el detalle y las líneas editadas traen unit_cost solo con la flag encendida', async () => {
      const detail = await getOrderById(fx().client, fx().storeId, fx().pedidoParcial, opts);
      expect(detail!.order_items).toHaveLength(2);
      for (const item of detail!.order_items) expect('unit_cost' in item).toBe(costos);

      // Pedido propio: editar sus líneas no puede cambiar la cobertura de los demás.
      const propio = (
        await createOrder(fx().client, fx().storeId, {
          notes: undefined,
          whatsapp_message: '',
          items: [{ product_id: fx().sinCosto, product_name: 'Sin costo', quantity: 1, unit_price: 80, is_by_weight: false, from_suggestion: false }],
        })
      ).order_id;

      const added = await addOrderItem(
        fx().client,
        fx().storeId,
        propio,
        { product_id: fx().conCosto, product_name: 'Con costo', quantity: 1, unit_price: 100, is_by_weight: false },
        opts
      );
      expect('unit_cost' in added).toBe(costos);

      const updated = await updateOrderItem(fx().client, fx().storeId, propio, added.id, { quantity: 3 }, opts);
      expect('unit_cost' in updated).toBe(costos);
      // La edición siguió funcionando sin el módulo.
      expect(Number(updated.quantity)).toBe(3);
    });

    it('Ranking: costo y margen del producto solo con la flag encendida', async () => {
      const rows = await getTopProducts(
        fx().client,
        fx().storeId,
        { startDate: null, endDate: null, limit: 10, categoryId: null, metric: 'revenue' },
        opts
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        for (const key of ['current_cost', 'margin', 'margin_pct']) expect(key in row).toBe(costos);
        expect(row.revenue).toBeGreaterThan(0); // lo demás sigue estando
      }
    });

    it('Dashboard: los pagos pendientes traen costo y margen solo con la flag encendida', async () => {
      const { orders } = await getPendingPayments(fx().client, fx().storeId, 1, opts);
      expect(orders.length).toBeGreaterThan(0);
      for (const order of orders) {
        for (const key of ['total_cost', 'margin', 'margin_pct', 'cost_coverage']) {
          expect(key in order, `${key} con costos=${costos}`).toBe(costos);
        }
      }
    });

    it('Informes: las columnas de costo y margen solo con la flag encendida', async () => {
      const productos = await exportProductos(fx().client, fx().storeId, opts);
      for (const row of productos) {
        for (const key of ['costo', 'margen', 'margen_pct']) expect(key in row).toBe(costos);
        expect(row).toHaveProperty('precio_venta');
      }
      const ventas = await exportVentas(fx().client, fx().storeId, { startDate: null, endDate: null }, opts);
      for (const row of ventas) {
        for (const key of ['costo_total', 'margen', 'margen_pct']) expect(key in row).toBe(costos);
      }
    });
  });

  describe('costos encendida: el margen cuenta solo los ítems con costo', () => {
    const fx = () => fixtures[COMBINACIONES.findIndex(([c, s]) => c && s)];

    it('un pedido sin ningún costo es "sin costo", uno con todos tiene margen y uno mixto es parcial', async () => {
      const orders = await getOrders(fx().client, fx().storeId, { costsEnabled: true });
      const byId = new Map(orders.map((o) => [o.id, o]));

      const completo = byId.get(fx().pedidoCompleto)!;
      expect(completo.cost_coverage).toBe('complete');
      expect(completo.total_cost).toBe(120);
      expect(completo.margin).toBe(80);

      const parcial = byId.get(fx().pedidoParcial)!;
      expect(parcial.cost_coverage).toBe('partial');
      expect(parcial.margin).toBe(80); // los 160 del ítem sin costo no inflan el margen

      const sinCosto = byId.get(fx().pedidoSinCosto)!;
      expect(sinCosto.cost_coverage).toBe('none');
      expect(sinCosto.total_cost).toBeNull();
      expect(sinCosto.margin).toBeNull();
      expect(sinCosto.margin_pct).toBeNull();
    });

    it('Dashboard: un pedido sin costo no infla el margen de los pagos pendientes', async () => {
      const { orders } = await getPendingPayments(fx().client, fx().storeId, 1, { costsEnabled: true });
      const sinCosto = orders.find((o) => o.id === fx().pedidoSinCosto)!;
      expect(sinCosto.cost_coverage).toBe('none');
      expect(sinCosto.margin).toBeNull();
    });

    it('el ranking marca "sin costo" al producto sin costo y no le asigna el precio como margen', async () => {
      const rows = await getTopProducts(fx().client, fx().storeId, { startDate: null, endDate: null, limit: 10, categoryId: null, metric: 'revenue' }, { costsEnabled: true });
      const con = rows.find((r) => r.product_id === fx().conCosto)!;
      const sin = rows.find((r) => r.product_id === fx().sinCosto)!;
      expect(con.current_cost).toBe(60);
      expect(con.margin).toBe(40);
      expect(sin.current_cost).toBeNull();
      expect(sin.margin).toBeNull();
      expect(sin.margin_pct).toBeNull();
    });

    it('los informes dejan en blanco el costo y el margen de lo que no tiene costo', async () => {
      const productos = await exportProductos(fx().client, fx().storeId, { costsEnabled: true });
      const sin = productos.find((r) => r.nombre === 'Sin costo' || r.producto === 'Sin costo');
      expect(sin).toBeDefined();
      expect(sin!.costo).toBeNull();
      expect(sin!.margen).toBeNull();
    });
  });
});
