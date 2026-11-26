import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import type { CreateProductInput, UpdateProductInput } from '../schemas/productSchemas';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { COMBO_NEEDS_COMPONENTS } from '../schemas/comboSchemas';
import { updateComboComponents } from './comboService';
import { setProductCost } from './productCostService';
import { setProductMaxStock } from './productStockService';
import { NO_COSTS, type CostOptions } from '@/lib/store/costOptions';
import type { StockOptions } from '@/lib/store/stockOptions';

/**
 * Módulos de la Store que cambian lo que el producto guarda y devuelve: `costos` (#183)
 * y `stock` (#184, el máximo de stock). Ambos fallan cerrado si el caller no los indica.
 */
export type ProductModuleOptions = CostOptions & Partial<StockOptions>;

/**
 * Service del dominio Products — ver ADR-0013, mismo patrón que
 * categoryService.ts (#115). Cada función recibe storeId explícito y es el
 * único lugar que filtra `store_id` para su operación.
 */

/**
 * Columnas del producto. El Costo (#183) no es una columna del producto: vive en
 * `product_costs` y se pide solo cuando la flag `costos` está encendida y quien
 * lee es el Store admin (ver `productColumns`). El máximo de stock (#184) tampoco:
 * vive en `product_stock.max_stock` y lo trae `listProductMaxStocks`.
 */
const BASE_COLUMNS = `
  id,
  name,
  price,
  image,
  active,
  sale_type,
  is_combo,
  category_id,
  subcategory_id,
  is_producto_surtido,
  familia_id,
  min_variedades,
  max_variedades,
  cat:categories!products_category_id_fkey(id, name),
  sub:subcategories!products_subcategory_id_fkey(id, name)
`;

const COST_EMBED = 'cost_row:product_costs!product_costs_product_store_fk(cost)';

const productColumns = (withCost: boolean): string => (withCost ? `${BASE_COLUMNS}, ${COST_EMBED}` : BASE_COLUMNS);


type JoinedRow = Record<string, unknown> & {
  cat?: { id: number; name: string } | null;
  sub?: { id: number; name: string } | null;
  cost_row?: { cost: number | string } | null;
};

function flatten(row: JoinedRow): Product {
  const { cat, sub, cost_row, ...rest } = row;
  const product = {
    ...rest,
    category_name: cat?.name ?? null,
    subcategory_name: sub?.name ?? null,
  } as Product;
  // `cost_row` solo viene si se pidió el costo; sin fila, el producto no tiene costo registrado.
  if ('cost_row' in row) product.cost = cost_row ? Number(cost_row.cost) : null;
  return product;
}

/**
 * Verifica que category_id/subcategory_id/familia_id (si vienen) pertenezcan
 * a esta Store — un admin de otra Store no debería poder colgar un producto
 * de una categoría/familia ajena. La FK compuesta ya lo garantiza a nivel de
 * schema para familia_id (#93); esto además da un 404 explícito en vez de
 * dejar que la FK constraint tire un 500 crudo.
 */
async function assertOwnership(
  supabase: SupabaseClient,
  storeId: number,
  fields: { category_id?: number | null; subcategory_id?: number | null; familia_id?: number | null }
): Promise<void> {
  if (fields.category_id != null) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('id', fields.category_id)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Category not found');
  }
  if (fields.subcategory_id != null) {
    const { data } = await supabase
      .from('subcategories')
      .select('id')
      .eq('id', fields.subcategory_id)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Subcategory not found');
  }
  if (fields.familia_id != null) {
    const { data } = await supabase
      .from('familias')
      .select('id')
      .eq('id', fields.familia_id)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Familia not found');
  }
}

export async function getProductById(
  supabase: SupabaseClient,
  storeId: number,
  id: number
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(productColumns(false))
    .eq('id', id)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return flatten(data as unknown as JoinedRow);
}

export async function createProduct(
  supabase: SupabaseClient,
  storeId: number,
  input: CreateProductInput,
  options: ProductModuleOptions = NO_COSTS
): Promise<Product> {
  // #167: createProductSchema ya lo exige; esto cubre a un caller que arme el
  // input sin pasar por el esquema.
  const components = input.components ?? [];
  if (input.is_combo && components.length === 0) {
    throw new ValidationError(COMBO_NEEDS_COMPONENTS);
  }

  await assertOwnership(supabase, storeId, input);

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name,
      price: input.price,
      image: input.image,
      active: input.active,
      sale_type: input.sale_type,
      is_combo: input.is_combo,
      category_id: input.category_id,
      subcategory_id: input.subcategory_id ?? null,
      is_producto_surtido: input.is_producto_surtido,
      familia_id: input.familia_id ?? null,
      min_variedades: input.min_variedades ?? null,
      max_variedades: input.max_variedades ?? null,
      store_id: storeId,
    })
    .select(productColumns(false))
    .single();

  if (error) {
    // Backstop del CHECK de la base — createProductSchema ya replica esta
    // regla, así que en uso normal nunca debería dispararse acá.
    if (error.code === '23514') {
      throw new ValidationError('Un Producto Surtido necesita Familia, mínimo y máximo de Variedades consistentes');
    }
    throw new Error(error.message);
  }

  const product = flatten(data as unknown as JoinedRow);

  // #183: el Costo va a su tabla, y solo si la Store tiene el módulo. Mismo criterio de
  // atomicidad que el alta de combos: si el costo no se puede guardar, no queda un
  // producto a medias.
  if (options.costsEnabled) {
    product.cost = input.cost ?? null;
    if (input.cost != null) {
      try {
        await setProductCost(supabase, storeId, product.id, input.cost);
      } catch (costError) {
        await supabase.from('products').delete().eq('id', product.id).eq('store_id', storeId);
        throw costError;
      }
    }
  }

  // #184: el máximo va a product_stock, y solo si la Store tiene el módulo `stock`. Mismo
  // criterio de atomicidad que el Costo: si no se puede guardar, no queda un producto a medias.
  if (options.stockEnabled) {
    product.max_stock = input.max_stock ?? null;
    if (input.max_stock != null) {
      try {
        await setProductMaxStock(supabase, storeId, product.id, input.max_stock);
      } catch (stockError) {
        await supabase.from('products').delete().eq('id', product.id).eq('store_id', storeId);
        throw stockError;
      }
    }
  }

  // #167: el alta de un combo es atómica. Antes eran dos pedidos (producto y
  // después componentes) y, si el segundo fallaba, quedaba un combo huérfano
  // con Disponible 0. Si los componentes no se pueden guardar, se borra el
  // producto recién creado y el error original sigue su camino.
  if (input.is_combo) {
    try {
      await updateComboComponents(supabase, storeId, product.id, { components });
    } catch (componentsError) {
      const { error: rollbackError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .eq('store_id', storeId);
      if (rollbackError) {
        console.error(
          `[createProduct] no se pudo borrar el combo ${product.id} tras fallar sus componentes:`,
          rollbackError.message
        );
      }
      throw componentsError;
    }
  }

  return product;
}

export async function updateProduct(
  supabase: SupabaseClient,
  storeId: number,
  id: number,
  input: UpdateProductInput,
  options: ProductModuleOptions = NO_COSTS
): Promise<Product> {
  await assertOwnership(supabase, storeId, input);

  // #167: pasar un producto común a combo solo se permite si ya tiene
  // componentes cargados — si no, quedaría un combo vacío. Un combo que ya
  // lo es no vuelve a pasar por esta verificación.
  if (input.is_combo === true) {
    const { data: current } = await supabase
      .from('products')
      .select('is_combo')
      .eq('id', id)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!current) throw new NotFoundError('Product not found');

    if (!current.is_combo) {
      const { count, error: countError } = await supabase
        .from('combo_components')
        .select('id', { count: 'exact', head: true })
        .eq('combo_product_id', id);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) === 0) {
        throw new ValidationError(COMBO_NEEDS_COMPONENTS);
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.price !== undefined) updates.price = input.price;
  if (input.image !== undefined) updates.image = input.image;
  if (input.active !== undefined) updates.active = input.active;
  if (input.sale_type !== undefined) updates.sale_type = input.sale_type;
  if (input.is_combo !== undefined) updates.is_combo = input.is_combo;
  if ('category_id' in input) updates.category_id = input.category_id ?? null;
  if ('subcategory_id' in input) updates.subcategory_id = input.subcategory_id ?? null;
  if (input.is_producto_surtido !== undefined) updates.is_producto_surtido = input.is_producto_surtido;
  if ('familia_id' in input) updates.familia_id = input.familia_id ?? null;
  if ('min_variedades' in input) updates.min_variedades = input.min_variedades ?? null;
  if ('max_variedades' in input) updates.max_variedades = input.max_variedades ?? null;

  // Un cambio que solo toca el Costo no actualiza ninguna columna del producto.
  const productQuery = supabase.from('products');
  const { data, error } = await (Object.keys(updates).length > 0
    ? productQuery.update(updates)
    : productQuery.select())
    .eq('id', id)
    .eq('store_id', storeId)
    .select(productColumns(options.costsEnabled))
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Product not found');
    if (error.code === '23514') {
      throw new ValidationError('Un Producto Surtido necesita Familia, mínimo y máximo de Variedades consistentes');
    }
    throw new Error(error.message);
  }

  // Si el costo pasó a ser > 0, corregir order_items que tengan unit_cost = 0
  // en órdenes pending/confirmed (snapshot era 0 porque el producto no
  // tenía costo). Ver nota original en products/[id]/route.ts (pre-#116):
  // no filtra `orders` por store_id — product_id ya acota correctamente qué
  // order_items se tocan; scopear orders/order_items en serio es de Orders
  // (#119), no de este ticket.
  // #183: con la flag `costos` apagada el costo no se escribe (ni se devuelve).
  const costToWrite = options.costsEnabled ? input.cost : undefined;
  if (costToWrite !== undefined) await setProductCost(supabase, storeId, id, costToWrite);

  // #184: con la flag `stock` apagada el máximo no se escribe (ni se devuelve).
  const maxToWrite = options.stockEnabled && 'max_stock' in input ? (input.max_stock ?? null) : undefined;
  if (maxToWrite !== undefined) await setProductMaxStock(supabase, storeId, id, maxToWrite);

  if (costToWrite != null && costToWrite > 0) {
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'confirmed']);

    if (activeOrders && activeOrders.length > 0) {
      const orderIds = activeOrders.map((o: { id: number }) => o.id);
      await supabase
        .from('order_items')
        .update({ unit_cost: costToWrite })
        .eq('product_id', id)
        .in('order_id', orderIds)
        .or('unit_cost.eq.0,unit_cost.is.null');
    }
  }

  const product = flatten(data as unknown as JoinedRow);
  if (options.costsEnabled && costToWrite !== undefined) product.cost = costToWrite;
  if (maxToWrite !== undefined) product.max_stock = maxToWrite;
  return product;
}

export async function deleteProduct(supabase: SupabaseClient, storeId: number, id: number): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}
