import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, Subcategory, CategoryWithSubcategories } from '@/features/admin/types/category.types';
import type { CategoryInput } from '../schemas/categorySchemas';
import { NotFoundError, ConflictError } from '@/lib/api/errors';
import { batchUpdateSortOrder } from '@/lib/store/batchUpdateSortOrder';

/**
 * Service del dominio Products (sub-área Categories) — ver ADR-0013. Cada
 * función recibe storeId explícito y es el único lugar que filtra
 * `store_id` para su operación — la ruta nunca toca Supabase directo.
 * Llamable tanto desde route handlers (Client Component → /api/...) como
 * directo desde un Server Component (sin round-trip HTTP, ver #107).
 */

const CATEGORY_COLUMNS = 'id, name, image_url, sort_order, created_at, updated_at';
const SUBCATEGORY_COLUMNS = 'id, name, category_id, sort_order, created_at, updated_at';

export async function listCategories(
  supabase: SupabaseClient,
  storeId: number,
  opts: { includeSubcategories?: boolean } = {}
): Promise<Category[] | CategoryWithSubcategories[]> {
  const columns = opts.includeSubcategories
    ? `${CATEGORY_COLUMNS}, subcategories(${SUBCATEGORY_COLUMNS})`
    : CATEGORY_COLUMNS;

  const { data, error } = await supabase
    .from('categories')
    .select(columns)
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Category[] | CategoryWithSubcategories[];
}

export async function createCategory(
  supabase: SupabaseClient,
  storeId: number,
  input: CategoryInput
): Promise<Category> {
  // sort_order = MAX(sort_order) + 1 dentro de esta Store, para que la nueva
  // categoría aparezca al final de su propia lista.
  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name, image_url: input.image_url ?? null, sort_order: nextSortOrder, store_id: storeId })
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') throw new ConflictError('Ya existe una categoría con ese nombre');
    throw new Error(error.message);
  }
  return data as Category;
}

export async function updateCategory(
  supabase: SupabaseClient,
  storeId: number,
  id: number,
  input: CategoryInput
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: input.name, image_url: input.image_url ?? null })
    .eq('id', id)
    .eq('store_id', storeId)
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') throw new ConflictError('Ya existe una categoría con ese nombre');
    if (error.code === 'PGRST116') throw new NotFoundError('Category not found');
    throw new Error(error.message);
  }
  return data as Category;
}

export async function deleteCategory(supabase: SupabaseClient, storeId: number, id: number): Promise<void> {
  // Delete es idempotente a propósito (mismo criterio que antes): borrar un
  // id que no existe o no pertenece a esta Store no es un error.
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}

export async function reorderCategories(supabase: SupabaseClient, storeId: number, orderedIds: number[]): Promise<void> {
  await batchUpdateSortOrder(supabase, {
    table: 'categories',
    storeId,
    ids: orderedIds,
    requiredColumns: ['name'],
  });
}

export async function listSubcategories(
  supabase: SupabaseClient,
  storeId: number,
  categoryId: number
): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select(SUBCATEGORY_COLUMNS)
    .eq('category_id', categoryId)
    .eq('store_id', storeId)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Subcategory[];
}

export async function createSubcategory(
  supabase: SupabaseClient,
  storeId: number,
  categoryId: number,
  name: string
): Promise<Subcategory> {
  // La categoría padre debe pertenecer a esta Store — si no, un admin de
  // otra Store podría colgar una subcategoría de una categoría ajena.
  const { data: parentCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('store_id', storeId)
    .maybeSingle();
  if (!parentCategory) throw new NotFoundError('Category not found');

  const { data: maxRow } = await supabase
    .from('subcategories')
    .select('sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('subcategories')
    .insert({ name, category_id: categoryId, sort_order: nextSortOrder, store_id: storeId })
    .select(SUBCATEGORY_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Ya existe una subcategoría con ese nombre en esta categoría');
    }
    throw new Error(error.message);
  }
  return data as Subcategory;
}

export async function updateSubcategory(
  supabase: SupabaseClient,
  storeId: number,
  id: number,
  name: string
): Promise<Subcategory> {
  const { data, error } = await supabase
    .from('subcategories')
    .update({ name })
    .eq('id', id)
    .eq('store_id', storeId)
    .select(SUBCATEGORY_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Ya existe una subcategoría con ese nombre en esta categoría');
    }
    if (error.code === 'PGRST116') throw new NotFoundError('Subcategory not found');
    throw new Error(error.message);
  }
  return data as Subcategory;
}

export async function deleteSubcategory(supabase: SupabaseClient, storeId: number, id: number): Promise<void> {
  const { error } = await supabase.from('subcategories').delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}

export async function reorderSubcategories(
  supabase: SupabaseClient,
  storeId: number,
  categoryId: number,
  orderedIds: number[]
): Promise<void> {
  await batchUpdateSortOrder(supabase, {
    table: 'subcategories',
    storeId,
    ids: orderedIds,
    requiredColumns: ['name'],
    knownColumns: { category_id: categoryId },
    extraOwnershipFilter: { category_id: categoryId },
  });
}
