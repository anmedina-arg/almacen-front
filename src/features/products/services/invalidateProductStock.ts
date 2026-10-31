import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { productStockTag } from '@/lib/cache/tags';

/**
 * Calcula qué tags de stock del catálogo hay que invalidar cuando cambia el
 * stock de un conjunto de productos (#146, spec #139; #158, spec #157) —
 * cualquier fuente: crear pedido (público y POS), editar o borrar un ítem,
 * cancelar, ingreso de stock o ajuste manual. Separada de
 * invalidateProductStockTags (que solo llama revalidateTag) para que esta
 * parte, la única con lógica real, sea testeable: revalidateTag tira fuera
 * de un request real de Next.js (confirmado empíricamente, mismo problema
 * que cookies()/after()), así que la función que lo llama no se puede
 * invocar desde Vitest — esta sí (2da pasada de code review de #146).
 *
 * Vive en Products porque la lógica real es del sub-módulo Combos
 * (ADR-0013): el stock de un combo no tiene fila propia, se deriva del de
 * sus componentes. Dos direcciones:
 * - Combo → componentes: reserve_order_stock/adjust_stock_on_item_update/
 *   return_stock_on_item_delete descuentan o devuelven el stock real en
 *   los COMPONENTES, no en el combo. Sin esto, un componente que también se
 *   vende por su cuenta podía quedar con stock cacheado desactualizado
 *   indefinidamente (hallazgo de code review de #146).
 * - Componente → combos (#158): el Disponible de un combo depende del stock
 *   de sus componentes, así que todo producto cuyo stock cambió invalida
 *   también a los combos que lo contienen — incluye otros combos que
 *   comparten componentes con un combo vendido.
 *
 * Cada lookup degrada por separado: si uno falla, se devuelven los tags ya
 * calculados más lo que el otro haya podido resolver — es una mejora de
 * precisión, no el cálculo primario, y no debe romper al caller.
 *
 * Trade-off aceptado (2da pasada de code review de #146): esto re-deriva en
 * TS la misma relación combo↔componentes que resuelven las funciones SQL.
 * Si esa lógica cambia del lado de la base (ej. combos anidados) sin un
 * cambio equivalente acá, la invalidación puede desincronizarse en
 * silencio. Tener las RPCs devolviendo los product_ids que tocaron lo
 * resolvería de raíz, pero es un cambio de schema más grande.
 */
export async function resolveProductStockTags(
  supabase: SupabaseClient,
  storeId: number,
  productIds: number[]
): Promise<string[]> {
  if (productIds.length === 0) return [];

  const tags = new Set(productIds.map((productId) => productStockTag(storeId, productId)));
  const touchedIds = new Set(productIds);

  const { data: components, error: componentsError } = await supabase
    .from('combo_components')
    .select('component_product_id')
    .eq('store_id', storeId)
    .in('combo_product_id', productIds);

  if (componentsError) {
    console.error('[resolveProductStockTags] combo components lookup error:', componentsError.message);
  }
  for (const row of components ?? []) {
    touchedIds.add(row.component_product_id);
    tags.add(productStockTag(storeId, row.component_product_id));
  }

  const { data: parents, error: parentsError } = await supabase
    .from('combo_components')
    .select('combo_product_id')
    .eq('store_id', storeId)
    .in('component_product_id', Array.from(touchedIds));

  if (parentsError) {
    console.error('[resolveProductStockTags] parent combos lookup error:', parentsError.message);
  }
  for (const row of parents ?? []) {
    tags.add(productStockTag(storeId, row.combo_product_id));
  }

  return Array.from(tags);
}

/** Invalida el stock cacheado del catálogo para cada producto cuyo stock
 * cambió, más sus componentes y los combos que lo contienen. Ver
 * resolveProductStockTags para la lógica de qué tags. */
export async function invalidateProductStockTags(
  supabase: SupabaseClient,
  storeId: number,
  productIds: number[]
): Promise<void> {
  const tags = await resolveProductStockTags(supabase, storeId, productIds);
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
