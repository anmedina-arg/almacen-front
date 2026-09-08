import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import type { CreateProductInput, UpdateProductInput } from '../schemas/productSchemas';
import { NotFoundError, ValidationError } from '@/lib/api/errors';

/**
 * Service del dominio Products — ver ADR-0013, mismo patrón que
 * categoryService.ts (#115). Cada función recibe storeId explícito y es el
 * único lugar que filtra `store_id` para su operación.
 */

const PRODUCT_COLUMNS = `
  id,
  name,
  price,
  cost,
  image,
  active,
  categories,
  mainCategory:main_category,
  sale_type,
  is_combo,
  max_stock,
  category_id,
  subcategory_id,
  is_producto_surtido,
  familia_id,
  min_variedades,
  max_variedades,
  cat:categories!products_category_id_fkey(id, name),
  sub:subcategories!products_subcategory_id_fkey(id, name)
`;

type JoinedRow = Record<string, unknown> & {
  cat?: { id: number; name: string } | null;
  sub?: { id: number; name: string } | null;
};

function flatten(row: JoinedRow): Product {
  const { cat, sub, ...rest } = row;
  return {
    ...rest,
    category_name: cat?.name ?? null,
    subcategory_name: sub?.name ?? null,
  } as Product;
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
    .select(PRODUCT_COLUMNS)
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
  input: CreateProductInput
): Promise<Product> {
  await assertOwnership(supabase, storeId, input);

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name,
      price: input.price,
      cost: input.cost,
      image: input.image,
      main_category: input.mainCategory ?? 'otros',
      categories: input.categories,
      active: input.active,
      sale_type: input.sale_type,
      is_combo: input.is_combo,
      max_stock: input.max_stock ?? null,
      category_id: input.category_id,
      subcategory_id: input.subcategory_id ?? null,
      is_producto_surtido: input.is_producto_surtido,
      familia_id: input.familia_id ?? null,
      min_variedades: input.min_variedades ?? null,
      max_variedades: input.max_variedades ?? null,
      store_id: storeId,
    })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    // Backstop del CHECK de la base — createProductSchema ya replica esta
    // regla, así que en uso normal nunca debería dispararse acá.
    if (error.code === '23514') {
      throw new ValidationError('Un Producto Surtido necesita Familia, mínimo y máximo de Variedades consistentes');
    }
    throw new Error(error.message);
  }
  return flatten(data as unknown as JoinedRow);
}

export async function updateProduct(
  supabase: SupabaseClient,
  storeId: number,
  id: number,
  input: UpdateProductInput
): Promise<Product> {
  await assertOwnership(supabase, storeId, input);

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.price !== undefined) updates.price = input.price;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.image !== undefined) updates.image = input.image;
  if (input.mainCategory !== undefined) updates.main_category = input.mainCategory;
  if (input.categories !== undefined) updates.categories = input.categories;
  if (input.active !== undefined) updates.active = input.active;
  if (input.sale_type !== undefined) updates.sale_type = input.sale_type;
  if (input.is_combo !== undefined) updates.is_combo = input.is_combo;
  if ('max_stock' in input) updates.max_stock = input.max_stock ?? null;
  if ('category_id' in input) updates.category_id = input.category_id ?? null;
  if ('subcategory_id' in input) updates.subcategory_id = input.subcategory_id ?? null;
  if (input.is_producto_surtido !== undefined) updates.is_producto_surtido = input.is_producto_surtido;
  if ('familia_id' in input) updates.familia_id = input.familia_id ?? null;
  if ('min_variedades' in input) updates.min_variedades = input.min_variedades ?? null;
  if ('max_variedades' in input) updates.max_variedades = input.max_variedades ?? null;

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('store_id', storeId)
    .select(PRODUCT_COLUMNS)
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
  if (input.cost !== undefined && input.cost > 0) {
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'confirmed']);

    if (activeOrders && activeOrders.length > 0) {
      const orderIds = activeOrders.map((o: { id: number }) => o.id);
      await supabase
        .from('order_items')
        .update({ unit_cost: input.cost })
        .eq('product_id', id)
        .in('order_id', orderIds)
        .or('unit_cost.eq.0,unit_cost.is.null');
    }
  }

  return flatten(data as unknown as JoinedRow);
}

export async function deleteProduct(supabase: SupabaseClient, storeId: number, id: number): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}
