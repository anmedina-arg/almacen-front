import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProduct, updateProduct } from '@/features/products/services/productService';
import { listProductCosts } from '@/features/products/services/productCostService';
import { getComboComponents, updateComboComponents } from '@/features/products/services/comboService';
import { fetchProductMetadata } from '@/features/catalog/services/fetchProductMetadata';
import { getOrders } from '@/features/orders/services/orderService';

// Spec #179, ticket #183 (ADR-0012 y ADR-0018): el módulo `costos` es una flag
// única e independiente. Con la flag encendida el Costo se guarda y se lee de
// `product_costs`; con la flag apagada el producto no lo pide, no lo guarda ni lo
// devuelve, y pedidos, ventas, catálogo y combos siguen funcionando igual. Apagar
// la flag nunca borra los costos ya cargados.
//
// Los servicios se llaman con el cliente service_role: acá se prueba la regla de
// la flag y de la tabla, no RLS (eso lo cubre product-costs.test.ts).
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe.skipIf(!hasCredentials)('flag costos — independencia y datos (#183)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const tag = randomUUID().slice(0, 8);
  const storeIds: number[] = [];
  const productIds: number[] = [];
  const orderIds: number[] = [];

  async function createStore(slug: string, costos: boolean, stock?: boolean) {
    const { data: store, error } = await admin
      .from('stores')
      .insert({ slug: `${slug}-${tag}`, name: slug, feature_flags: stock === undefined ? { costos } : { costos, stock } })
      .select('id')
      .single();
    expect(error).toBeNull();
    storeIds.push(store!.id);
    const { data: category } = await admin
      .from('categories')
      .insert({ name: `cat-${slug}`, store_id: store!.id })
      .select('id')
      .single();
    return { storeId: store!.id as number, categoryId: category!.id as number };
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

  const costRows = async (productId: number) =>
    (await admin.from('product_costs').select('cost').eq('product_id', productId)).data!.map((r) => Number(r.cost));

  afterAll(async () => {
    if (orderIds.length > 0) {
      await admin.from('order_items').delete().in('order_id', orderIds);
      await admin.from('orders').delete().in('id', orderIds);
    }
    if (productIds.length > 0) {
      await admin.from('combo_components').delete().in('combo_product_id', productIds);
      await admin.from('product_costs').delete().in('product_id', productIds);
      await admin.from('product_price_history').delete().in('product_id', productIds);
      await admin.from('products').delete().in('id', productIds);
    }
    await admin.from('categories').delete().in('store_id', storeIds);
    await admin.from('stores').delete().in('id', storeIds);
  });

  describe('costos encendida: el costo va a su tabla', () => {
    let store: { storeId: number; categoryId: number };
    beforeAll(async () => {
      store = await createStore('costos-on', true);
    });

    it('crear con costo lo guarda en product_costs y lo devuelve', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'con costo', { cost: 12.5 }), { costsEnabled: true });
      productIds.push(product.id);
      expect(product.cost).toBe(12.5);
      expect(await costRows(product.id)).toEqual([12.5]);
    });

    it('crear sin costo no registra nada: sin costo registrado, no cero', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'sin costo'), { costsEnabled: true });
      productIds.push(product.id);
      expect(product.cost).toBeNull();
      expect(await costRows(product.id)).toEqual([]);
    });

    it('un costo en cero escrito a propósito se registra como cero', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'costo cero', { cost: 0 }), { costsEnabled: true });
      productIds.push(product.id);
      expect(await costRows(product.id)).toEqual([0]);
    });

    it('editar el costo lo cambia, y mandar null lo quita', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'editable', { cost: 10 }), { costsEnabled: true });
      productIds.push(product.id);

      const changed = await updateProduct(admin, store.storeId, product.id, { cost: 20 }, { costsEnabled: true });
      expect(changed.cost).toBe(20);
      expect(changed.name).toBe('editable'); // un cambio solo de costo no toca el resto
      expect(await costRows(product.id)).toEqual([20]);

      const cleared = await updateProduct(admin, store.storeId, product.id, { cost: null }, { costsEnabled: true });
      expect(cleared.cost).toBeNull();
      expect(await costRows(product.id)).toEqual([]);
    });

    it('editar otro dato no toca el costo', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'solo precio', { cost: 7 }), { costsEnabled: true });
      productIds.push(product.id);
      const updated = await updateProduct(admin, store.storeId, product.id, { price: 999 }, { costsEnabled: true });
      expect(updated.price).toBe(999);
      expect(updated.cost).toBe(7);
      expect(await costRows(product.id)).toEqual([7]);
    });

    it('listProductCosts trae solo los productos con costo de esa Store', async () => {
      const costs = await listProductCosts(admin, store.storeId);
      const withCost = [...costs.values()];
      expect(withCost).toContain(12.5);
      expect(withCost).toContain(0);
      // 'sin costo' no aparece
      const sinCosto = (await admin.from('products').select('id').eq('store_id', store.storeId).eq('name', 'sin costo').single()).data!.id;
      expect(costs.has(sinCosto)).toBe(false);
    });
  });

  // #187 (ADR-0018): con la flag apagada el cálculo del costo del combo no corre y el combo
  // no tiene fila de costo; encendida, se calcula de sus componentes. Apagar la flag no
  // borra el costo que un combo ya tenía.
  describe('combos y costos', () => {
    async function comboConComponentes(storeId: number, categoryId: number, costsEnabled: boolean, name: string) {
      const a = await createProduct(admin, storeId, input(categoryId, `${name} a`, { cost: 10 }), { costsEnabled: true });
      const b = await createProduct(admin, storeId, input(categoryId, `${name} b`, { cost: 5 }), { costsEnabled: true });
      productIds.push(a.id, b.id);
      const combo = await createProduct(
        admin,
        storeId,
        input(categoryId, name, {
          is_combo: true,
          components: [
            { component_product_id: a.id, quantity: 2 },
            { component_product_id: b.id, quantity: 1 },
          ],
        }),
        { costsEnabled }
      );
      productIds.push(combo.id);
      return { a, b, combo };
    }

    it('con la flag encendida el costo del combo se calcula de sus componentes', async () => {
      const on = await createStore('combos-on', true);
      const { combo } = await comboConComponentes(on.storeId, on.categoryId, true, 'combo-on');
      expect(await costRows(combo.id)).toEqual([25]);
    });

    it('con la flag apagada el combo se crea sin fila de costo, aunque sus componentes tengan costo', async () => {
      const off = await createStore('combos-off', false);
      const { combo } = await comboConComponentes(off.storeId, off.categoryId, false, 'combo-off');
      expect(combo.is_combo).toBe(true);
      expect(await costRows(combo.id)).toEqual([]);
    });

    it('con la flag apagada editar la composición funciona y sigue sin costo', async () => {
      const off = await createStore('combos-off-edit', false);
      const { combo, a } = await comboConComponentes(off.storeId, off.categoryId, false, 'combo-off-edit');
      await updateComboComponents(admin, off.storeId, combo.id, { components: [{ component_product_id: a.id, quantity: 3 }] });
      expect(await costRows(combo.id)).toEqual([]);
    });

    it('apagar la flag no borra ni recalcula el costo que el combo ya tenía', async () => {
      const toggle = await createStore('combos-toggle', true);
      const { combo, a } = await comboConComponentes(toggle.storeId, toggle.categoryId, true, 'combo-toggle');
      expect(await costRows(combo.id)).toEqual([25]);

      await admin.from('stores').update({ feature_flags: { costos: false } }).eq('id', toggle.storeId);
      await updateComboComponents(admin, toggle.storeId, combo.id, { components: [{ component_product_id: a.id, quantity: 1 }] });
      expect(await costRows(combo.id)).toEqual([25]); // intacto

      await admin.from('stores').update({ feature_flags: { costos: true } }).eq('id', toggle.storeId);
      await updateComboComponents(admin, toggle.storeId, combo.id, { components: [{ component_product_id: a.id, quantity: 1 }] });
      expect(await costRows(combo.id)).toEqual([10]); // vuelve a calcularse
    });

    // ADR-0012: `costos` y `stock` son independientes. El costo del combo no depende del stock, y
    // el stock del combo no depende del costo.
    it.each([
      [true, false],
      [false, true],
      [false, false],
      [true, true],
    ])('costos=%s, stock=%s: el combo se crea y su costo sigue la flag de costos', async (costos, stock) => {
      const store = await createStore(`combos-${costos ? 'c' : 'x'}${stock ? 's' : 'x'}`, costos, stock);
      const { combo } = await comboConComponentes(store.storeId, store.categoryId, costos, `combo-${costos}-${stock}`);
      expect(combo.is_combo).toBe(true);
      expect(await costRows(combo.id)).toEqual(costos ? [25] : []);
    });

    it('los componentes del combo no devuelven su costo sin el módulo', async () => {
      const off = await createStore('combos-resp', false);
      const { combo } = await comboConComponentes(off.storeId, off.categoryId, false, 'combo-resp');
      const sin = await getComboComponents(admin, off.storeId, combo.id, { costsEnabled: false });
      for (const component of sin) expect(component).not.toHaveProperty('component_product_cost');
      const con = await getComboComponents(admin, off.storeId, combo.id, { costsEnabled: true });
      expect(con.map((c) => c.component_product_cost)).toEqual([10, 5]);
    });
  });

  describe('costos apagada: el producto no lo pide, no lo guarda ni lo devuelve', () => {
    let store: { storeId: number; categoryId: number };
    beforeAll(async () => {
      store = await createStore('costos-off', false);
    });

    it('crear con un costo en el pedido lo ignora', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'ignora costo', { cost: 99 }), { costsEnabled: false });
      productIds.push(product.id);
      expect(product).not.toHaveProperty('cost');
      expect(await costRows(product.id)).toEqual([]);
    });

    it('sin indicar nada se trata como flag apagada', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'por defecto', { cost: 5 }));
      productIds.push(product.id);
      expect(await costRows(product.id)).toEqual([]);
    });

    it('editar con un costo lo ignora y no cambia el que ya había', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'edita', {}), { costsEnabled: false });
      productIds.push(product.id);
      await admin.from('product_costs').insert({ product_id: product.id, store_id: store.storeId, cost: 40 });

      const updated = await updateProduct(admin, store.storeId, product.id, { price: 150, cost: 1 }, { costsEnabled: false });
      expect(updated.price).toBe(150);
      expect(updated).not.toHaveProperty('cost');
      expect(await costRows(product.id)).toEqual([40]);
    });

    it('el catálogo público no trae el costo de ningún producto', async () => {
      const products = await fetchProductMetadata(admin, store.storeId, { includeInactive: true });
      expect(products.length).toBeGreaterThan(0);
      for (const product of products) expect(product).not.toHaveProperty('cost');
    });

    it('apagar la flag no borra los costos ya cargados', async () => {
      const on = await createStore('costos-toggle', true);
      const product = await createProduct(admin, on.storeId, input(on.categoryId, 'se conserva', { cost: 33 }), { costsEnabled: true });
      productIds.push(product.id);

      await admin.from('stores').update({ feature_flags: { costos: false } }).eq('id', on.storeId);
      expect(await costRows(product.id)).toEqual([33]);

      await admin.from('stores').update({ feature_flags: { costos: true } }).eq('id', on.storeId);
      const costs = await listProductCosts(admin, on.storeId);
      expect(costs.get(product.id)).toBe(33);
    });

    it('un combo se crea y se edita sin depender del módulo', async () => {
      const a = await createProduct(admin, store.storeId, input(store.categoryId, 'comp a'), { costsEnabled: false });
      const b = await createProduct(admin, store.storeId, input(store.categoryId, 'comp b'), { costsEnabled: false });
      productIds.push(a.id, b.id);
      const combo = await createProduct(
        admin,
        store.storeId,
        input(store.categoryId, 'combo', {
          is_combo: true,
          components: [
            { component_product_id: a.id, quantity: 1 },
            { component_product_id: b.id, quantity: 2 },
          ],
        }),
        { costsEnabled: false }
      );
      productIds.push(combo.id);
      expect(combo.is_combo).toBe(true);
      const renamed = await updateProduct(admin, store.storeId, combo.id, { name: 'combo editado' }, { costsEnabled: false });
      expect(renamed.name).toBe('combo editado');
    });

    it('los pedidos se crean, se editan y se cancelan sin el módulo', async () => {
      const product = await createProduct(admin, store.storeId, input(store.categoryId, 'vendido'), { costsEnabled: false });
      productIds.push(product.id);

      const { data, error } = await admin.rpc('create_order', {
        p_user_id: null,
        p_notes: 'pedido sin costos',
        p_whatsapp_message: null,
        p_items: [{ product_id: product.id, product_name: 'vendido', quantity: 2, unit_price: 100, unit_cost: 0, is_by_weight: false }],
        p_store_id: store.storeId,
      });
      expect(error).toBeNull();
      const orderId = data.order_id as number;
      orderIds.push(orderId);

      const orders = await getOrders(admin, store.storeId);
      expect(orders.find((o) => o.id === orderId)).toBeDefined();

      const { data: item } = await admin.from('order_items').select('id').eq('order_id', orderId).single();
      expect((await admin.from('order_items').update({ quantity: 3 }).eq('id', item!.id)).error).toBeNull();

      const cancel = await admin.rpc('cancel_order', { p_order_id: orderId });
      expect(cancel.error).toBeNull();
    });
  });
});
