import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProduct, updateProduct } from '@/features/products/services/productService';
import { updateComboComponents } from '@/features/products/services/comboService';
import { createProductSchema } from '@/features/products/schemas/productSchemas';

// #167: un combo sin componentes es un error de carga (decisión de Andrés,
// 2026-10-30). Con Disponible 0 cada pedido lo registra con Faltante igual a
// la cantidad pedida. Se corrige donde se carga, sin excepciones en
// reserve_order_stock ni get_available_stock.
//
// Antes el alta eran dos pedidos (POST /api/products y después PUT
// /combos/[id]/components): si el segundo fallaba quedaba un combo huérfano.
// Ahora el alta es atómica en el servicio: si los componentes no se pueden
// guardar, el producto recién creado se borra.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('combos: nunca sin componentes (#167)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');

  let storeId: number;
  let otherStoreId: number;
  let categoryId: number;
  let componentA: number;
  let componentB: number;
  let foreignComponent: number;
  const createdProductIds: number[] = [];
  const storeIds: number[] = [];

  async function insertProduct(store: number, name: string, fields: Record<string, unknown> = {}): Promise<number> {
    const { data, error } = await admin
      .from('products')
      .insert({ name: `${name}-${randomUUID().slice(0, 8)}`, price: 100, cost: 50, image: '', categories: '', store_id: store, active: false, ...fields })
      .select('id')
      .single();
    expect(error).toBeNull();
    createdProductIds.push(data!.id);
    return data!.id;
  }

  async function componentsOf(comboId: number): Promise<Array<{ id: number; quantity: number }>> {
    const { data, error } = await admin
      .from('combo_components')
      .select('component_product_id, quantity')
      .eq('combo_product_id', comboId)
      .order('component_product_id');
    expect(error).toBeNull();
    return (data ?? []).map((row) => ({ id: row.component_product_id as number, quantity: Number(row.quantity) }));
  }

  async function productExists(id: number): Promise<boolean> {
    const { data } = await admin.from('products').select('id').eq('id', id).maybeSingle();
    return data !== null;
  }

  async function isCombo(id: number): Promise<boolean> {
    const { data } = await admin.from('products').select('is_combo').eq('id', id).single();
    return data!.is_combo as boolean;
  }

  // Tal como lo recibe el servicio desde la ruta: ya pasó por el esquema.
  function comboInput(components: Array<{ component_product_id: number; quantity: number }>, name = `combo-${randomUUID().slice(0, 8)}`) {
    return createProductSchema.parse({
      name,
      price: 500,
      category_id: categoryId,
      is_combo: true,
      components,
    });
  }

  async function countProductsNamed(name: string): Promise<number> {
    const { count } = await admin.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('name', name);
    return count ?? 0;
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    const slug = `test-combo-req-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin.from('stores').insert({ slug, name: slug }).select('id').single();
    expect(storeError).toBeNull();
    storeId = store!.id;
    storeIds.push(storeId);

    const { data: other, error: otherError } = await admin.from('stores').insert({ slug: `${slug}-b`, name: `${slug}-b` }).select('id').single();
    expect(otherError).toBeNull();
    otherStoreId = other!.id;
    storeIds.push(otherStoreId);

    const { data: category, error: categoryError } = await admin.from('categories').insert({ name: 'Combos de prueba', store_id: storeId }).select('id').single();
    expect(categoryError).toBeNull();
    categoryId = category!.id;

    componentA = await insertProduct(storeId, 'componente-a');
    componentB = await insertProduct(storeId, 'componente-b');
    foreignComponent = await insertProduct(otherStoreId, 'componente-ajeno');
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('combo_components').delete().in('combo_product_id', createdProductIds);
    await admin.from('product_price_history').delete().in('product_id', createdProductIds);
    await admin.from('products').delete().in('id', createdProductIds);
    await admin.from('categories').delete().eq('id', categoryId);
    await admin.from('stores').delete().in('id', storeIds);
  });

  describe('alta', () => {
    it.skipIf(!hasCredentials)('un combo con componentes queda creado con sus componentes en la misma operación', async () => {
      const combo = await createProduct(admin, storeId, comboInput([
        { component_product_id: componentA, quantity: 2 },
        { component_product_id: componentB, quantity: 1 },
      ]));
      createdProductIds.push(combo.id);

      expect(combo.is_combo).toBe(true);
      expect(await componentsOf(combo.id)).toEqual([
        { id: componentA, quantity: 2 },
        { id: componentB, quantity: 1 },
      ]);
    });

    it.skipIf(!hasCredentials)('si los componentes no se pueden guardar, no queda ningún producto huérfano', async () => {
      const name = `combo-huerfano-${randomUUID().slice(0, 8)}`;

      // Un componente de otra Store: el servicio lo rechaza después de crear el producto.
      await expect(
        createProduct(admin, storeId, comboInput([{ component_product_id: foreignComponent, quantity: 1 }], name))
      ).rejects.toThrow(/not found in this store/i);

      expect(await countProductsNamed(name)).toBe(0);
    });

    it.skipIf(!hasCredentials)('el servicio rechaza un combo sin componentes aunque no pase por el esquema', async () => {
      const name = `combo-vacio-${randomUUID().slice(0, 8)}`;
      // Se arma a mano, salteando createProductSchema: defensa en profundidad.
      const input = { ...comboInput([{ component_product_id: componentA, quantity: 1 }], name), components: undefined };

      await expect(createProduct(admin, storeId, input)).rejects.toThrow(/al menos un componente/i);

      expect(await countProductsNamed(name)).toBe(0);
    });
  });

  describe('edición de componentes', () => {
    async function newCombo() {
      const combo = await createProduct(admin, storeId, comboInput([
        { component_product_id: componentA, quantity: 2 },
        { component_product_id: componentB, quantity: 1 },
      ]));
      createdProductIds.push(combo.id);
      return combo.id;
    }

    it.skipIf(!hasCredentials)('no se puede dejar un combo sin componentes y sus componentes quedan intactos', async () => {
      const comboId = await newCombo();

      await expect(updateComboComponents(admin, storeId, comboId, { components: [] })).rejects.toThrow(/al menos un componente/i);

      expect(await componentsOf(comboId)).toEqual([
        { id: componentA, quantity: 2 },
        { id: componentB, quantity: 1 },
      ]);
    });

    it.skipIf(!hasCredentials)('cambiar solo cantidades no borra ni agrega componentes', async () => {
      const comboId = await newCombo();

      await updateComboComponents(admin, storeId, comboId, {
        components: [
          { component_product_id: componentA, quantity: 3 },
          { component_product_id: componentB, quantity: 4 },
        ],
      });

      expect(await componentsOf(comboId)).toEqual([
        { id: componentA, quantity: 3 },
        { id: componentB, quantity: 4 },
      ]);
    });

    it.skipIf(!hasCredentials)('agregar un componente nuevo conserva los que ya estaban', async () => {
      const comboId = await newCombo();
      const componentC = await insertProduct(storeId, 'componente-c');

      await updateComboComponents(admin, storeId, comboId, {
        components: [
          { component_product_id: componentA, quantity: 2 },
          { component_product_id: componentB, quantity: 1 },
          { component_product_id: componentC, quantity: 6 },
        ],
      });

      expect(await componentsOf(comboId)).toEqual([
        { id: componentA, quantity: 2 },
        { id: componentB, quantity: 1 },
        { id: componentC, quantity: 6 },
      ]);
    });

    it.skipIf(!hasCredentials)('reemplazar la composición cambia cantidades y quita lo que ya no está', async () => {
      const comboId = await newCombo();

      await updateComboComponents(admin, storeId, comboId, { components: [{ component_product_id: componentA, quantity: 5 }] });

      expect(await componentsOf(comboId)).toEqual([{ id: componentA, quantity: 5 }]);
    });
  });

  describe('convertir un producto común en combo', () => {
    it.skipIf(!hasCredentials)('se rechaza si el producto no tiene componentes', async () => {
      const plain = await insertProduct(storeId, 'comun');

      await expect(updateProduct(admin, storeId, plain, { is_combo: true })).rejects.toThrow(/al menos un componente/i);

      expect(await isCombo(plain)).toBe(false);
    });

    it.skipIf(!hasCredentials)('se permite si ya tiene componentes cargados', async () => {
      const plain = await insertProduct(storeId, 'comun-con-componentes');
      const { error } = await admin
        .from('combo_components')
        .insert({ combo_product_id: plain, component_product_id: componentA, quantity: 1, store_id: storeId });
      expect(error).toBeNull();

      await updateProduct(admin, storeId, plain, { is_combo: true });

      expect(await isCombo(plain)).toBe(true);
    });

    it.skipIf(!hasCredentials)('editar un combo que ya lo es no vuelve a exigir nada', async () => {
      const combo = await createProduct(admin, storeId, comboInput([{ component_product_id: componentA, quantity: 1 }]));
      createdProductIds.push(combo.id);

      const updated = await updateProduct(admin, storeId, combo.id, { is_combo: true, name: `renombrado-${randomUUID().slice(0, 8)}` });

      expect(updated.is_combo).toBe(true);
      expect(await productExists(combo.id)).toBe(true);
    });
  });
});
