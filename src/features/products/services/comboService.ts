import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { COMBO_NEEDS_COMPONENTS, type UpdateComboComponentsInput } from '../schemas/comboSchemas';

export interface ComboComponent {
  id: number;
  combo_product_id: number;
  component_product_id: number;
  quantity: number;
  component_product_name: string | null;
  component_product_price: number | null;
  component_product_cost: number | null;
}

/**
 * Confirma que el combo pertenece a la Store del caller. `combo_product_id`
 * es FK a products.id, ya scoped por Store desde #15 — una vez que esto
 * pasa, cualquier query posterior filtrada por ese id (en vez de por
 * combo_components.store_id de nuevo) ya está transitivamente scoped, sin
 * necesidad de un filtro redundante.
 */
async function comboBelongsToStore(
  supabase: SupabaseClient,
  comboId: number,
  storeId: number
): Promise<boolean> {
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('id', comboId)
    .eq('store_id', storeId)
    .maybeSingle();
  return data != null;
}

export async function getComboComponents(
  supabase: SupabaseClient,
  storeId: number,
  comboId: number
): Promise<ComboComponent[]> {
  if (!(await comboBelongsToStore(supabase, comboId, storeId))) {
    throw new NotFoundError('Combo not found in this store');
  }

  // Filtra por combo_product_id, no por combo_components.store_id — ver
  // comboBelongsToStore(): ese id ya quedó confirmado como propio de esta
  // Store arriba, un filtro extra acá sería redundante.
  const { data, error } = await supabase
    .from('combo_components')
    .select(
      `
      id,
      combo_product_id,
      component_product_id,
      quantity,
      products!combo_components_component_product_id_fkey(name, price, cost)
    `
    )
    .eq('combo_product_id', comboId)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const product = row.products as unknown as { name: string; price: number; cost: number } | null;
    return {
      id: row.id,
      combo_product_id: row.combo_product_id,
      component_product_id: row.component_product_id,
      quantity: row.quantity,
      component_product_name: product?.name ?? null,
      component_product_price: product?.price ?? null,
      component_product_cost: product?.cost ?? null,
    };
  });
}

export async function updateComboComponents(
  supabase: SupabaseClient,
  storeId: number,
  comboId: number,
  input: UpdateComboComponentsInput
): Promise<void> {
  // #167: defensa en profundidad — la ruta ya lo rechaza con el esquema, pero
  // esta función también la llama el alta de un combo (productService).
  if (input.components.length === 0) {
    throw new ValidationError(COMBO_NEEDS_COMPONENTS);
  }

  if (!(await comboBelongsToStore(supabase, comboId, storeId))) {
    throw new NotFoundError('Combo not found in this store');
  }

  // Cada componente también tiene que pertenecer a la misma Store — evita
  // que un combo termine referenciando el producto de otra Store como
  // componente.
  const componentIds = input.components.map((c) => c.component_product_id);
  const { data: ownComponents } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .in('id', componentIds);

  const ownIds = new Set((ownComponents ?? []).map((p) => p.id));
  const foreignId = componentIds.find((cid) => !ownIds.has(cid));
  if (foreignId != null) {
    throw new ValidationError(`Component product not found in this store: ${foreignId}`);
  }

  // Reemplaza la composición SIN pasar por un estado vacío (#167): primero
  // inserta o actualiza los componentes nuevos y recién después borra los que
  // ya no están. Antes borraba todo y reinsertaba, y un fallo entre los dos
  // pasos dejaba el combo sin componentes. Filtra por combo_product_id, no
  // por combo_components.store_id — mismo motivo que en getComboComponents,
  // ya validado arriba vía comboBelongsToStore().
  const rows = input.components.map((c) => ({
    combo_product_id: comboId,
    component_product_id: c.component_product_id,
    quantity: c.quantity,
    store_id: storeId,
  }));
  const { error: upsertError } = await supabase
    .from('combo_components')
    .upsert(rows, { onConflict: 'combo_product_id,component_product_id' });
  if (upsertError) throw new Error(upsertError.message);

  const { data: current, error: currentError } = await supabase
    .from('combo_components')
    .select('component_product_id')
    .eq('combo_product_id', comboId);
  if (currentError) throw new Error(currentError.message);

  const keep = new Set(componentIds);
  const toRemove = (current ?? []).map((row) => row.component_product_id as number).filter((id) => !keep.has(id));
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('combo_components')
      .delete()
      .eq('combo_product_id', comboId)
      .in('component_product_id', toRemove);
    if (deleteError) throw new Error(deleteError.message);
  }
}
