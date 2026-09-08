import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, ConflictError } from '@/lib/api/errors';
import type { FamiliaInput, VariedadInput, UpdateVariedadInput } from '../schemas/familiaSchemas';
import type { Familia, FamiliaWithVariedades, Variedad } from '@/features/admin/types/familia.types';

/**
 * Service del dominio Products (sub-módulo Producto Surtido) — ver
 * ADR-0013, mismo patrón que categoryService.ts/productService.ts/
 * comboService.ts (#115/#116/#117). Familias/Variedades no tienen carpeta
 * propia según ADR-0013, viven acá.
 */

export async function listFamilias(
  supabase: SupabaseClient,
  storeId: number,
  opts: { includeVariedades?: boolean } = {}
): Promise<Familia[] | FamiliaWithVariedades[]> {
  const columns = opts.includeVariedades
    ? 'id, name, created_at, updated_at, variedades(id, name, familia_id, active, created_at, updated_at)'
    : 'id, name, created_at, updated_at';

  const { data, error } = await supabase
    .from('familias')
    .select(columns)
    .eq('store_id', storeId)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Familia[] | FamiliaWithVariedades[];
}

export async function createFamilia(
  supabase: SupabaseClient,
  storeId: number,
  input: FamiliaInput
): Promise<Familia> {
  const { data, error } = await supabase
    .from('familias')
    .insert({ name: input.name, store_id: storeId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new ConflictError('Ya existe una familia con ese nombre');
    throw new Error(error.message);
  }
  return data as Familia;
}

export async function updateFamilia(
  supabase: SupabaseClient,
  storeId: number,
  id: number,
  input: FamiliaInput
): Promise<Familia> {
  const { data, error } = await supabase
    .from('familias')
    .update({ name: input.name })
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new ConflictError('Ya existe una familia con ese nombre');
    if (error.code === 'PGRST116') throw new NotFoundError('Familia not found');
    throw new Error(error.message);
  }
  return data as Familia;
}

/**
 * Variedades son ON DELETE CASCADE de su Familia (#93) — products.familia_id
 * NO tiene cascade a propósito (ver familias.sql), así que borrar una
 * Familia con productos Surtido activos revienta la FK (23503), mapeado acá
 * a un mensaje claro en vez de un 500 crudo.
 */
export async function deleteFamilia(supabase: SupabaseClient, storeId: number, id: number): Promise<void> {
  const { error } = await supabase.from('familias').delete().eq('id', id).eq('store_id', storeId);

  if (error) {
    if (error.code === '23503') {
      throw new ConflictError(
        'No se puede eliminar: todavía hay productos marcados como Producto Surtido de esta Familia'
      );
    }
    throw new Error(error.message);
  }
}

export async function createVariedad(
  supabase: SupabaseClient,
  storeId: number,
  familiaId: number,
  input: VariedadInput
): Promise<Variedad> {
  // La Familia padre debe pertenecer a esta Store — si no, un admin de otra
  // Store podría colgar una Variedad de una Familia ajena. La FK compuesta
  // ya lo garantiza a nivel de schema (ver variedades.sql, #103) — esto es
  // solo para devolver un 404 claro en vez de que el INSERT reviente con un
  // error de FK genérico.
  const { data: parentFamilia } = await supabase
    .from('familias')
    .select('id')
    .eq('id', familiaId)
    .eq('store_id', storeId)
    .maybeSingle();
  if (!parentFamilia) throw new NotFoundError('Familia not found');

  const { data, error } = await supabase
    .from('variedades')
    .insert({ name: input.name, familia_id: familiaId, store_id: storeId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Ya existe una variedad con ese nombre en esta familia');
    }
    throw new Error(error.message);
  }
  return data as Variedad;
}

export async function updateVariedad(
  supabase: SupabaseClient,
  storeId: number,
  id: number,
  input: UpdateVariedadInput
): Promise<Variedad> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.active !== undefined) updates.active = input.active;

  const { data, error } = await supabase
    .from('variedades')
    .update(updates)
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Ya existe una variedad con ese nombre en esta familia');
    }
    if (error.code === 'PGRST116') throw new NotFoundError('Variedad not found');
    throw new Error(error.message);
  }
  return data as Variedad;
}
