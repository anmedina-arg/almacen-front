import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { productStockTag } from '@/lib/cache/tags';

/**
 * Calcula qué tags de stock hay que invalidar para una operación de orden
 * (#146, spec #139) — separada de invalidateOrderStockTags (que solo
 * llama revalidateTag) para que esta parte, la única con lógica real, sea
 * testeable: revalidateTag tira fuera de un request real de Next.js
 * (confirmado empíricamente, mismo problema que cookies()/after()), así
 * que la función que lo llama no se puede invocar desde Vitest — esta sí
 * (2da pasada de code review de #146).
 *
 * Combo-aware: si algún item es un combo, reserve_order_stock/
 * adjust_stock_on_item_update/return_stock_on_item_delete descuentan o
 * devuelven el stock real en los COMPONENTES, no en el combo (que no
 * tiene fila propia en product_stock) — se resuelve con una query a
 * combo_components. Sin esto, un componente que también se vende activo
 * por su cuenta en el catálogo podía quedar con stock cacheado
 * desactualizado indefinidamente (hallazgo de code review de #146).
 *
 * Trade-off aceptado (2da pasada de code review): esto re-deriva en TS el
 * mismo join combo→componentes que ya resuelven las funciones SQL
 * (reserve_order_stock, etc.) para saber qué product_stock tocaron. Si
 * esa lógica de combos cambia del lado de la base (ej. combos anidados)
 * sin un cambio equivalente acá, la invalidación puede desincronizarse en
 * silencio. Tener las RPCs devolviendo los product_ids que tocaron
 * resolvería esto de raíz, pero es un cambio de schema más grande
 * (touching reserve_order_stock/return_order_stock/
 * adjust_stock_on_item_update) — fuera de alcance de este ticket.
 */
export async function resolveOrderStockTags(
  supabase: SupabaseClient,
  storeId: number,
  items: Array<{ product_id: number }>
): Promise<string[]> {
  const productIds = items.map((item) => item.product_id);
  if (productIds.length === 0) return [];

  const tags = new Set(productIds.map((productId) => productStockTag(storeId, productId)));

  const { data: components, error } = await supabase
    .from('combo_components')
    .select('component_product_id')
    .in('combo_product_id', productIds);

  // No tira: los tags de los productos "de arriba" ya están calculados, y
  // esto es una mejora de precisión (componentes de combo), no el cálculo
  // primario — degradar en vez de romper al caller por un problema en un
  // lookup secundario.
  if (error) {
    console.error('[resolveOrderStockTags] combo_components lookup error:', error.message);
    return Array.from(tags);
  }

  for (const row of components ?? []) {
    tags.add(productStockTag(storeId, row.component_product_id));
  }

  return Array.from(tags);
}

/** Invalida el stock cacheado de cada producto afectado por una operación
 * de orden — crear pedido (público y POS), editar cantidad de un item, o
 * borrar un item. Ver resolveOrderStockTags para la lógica de qué tags. */
export async function invalidateOrderStockTags(
  supabase: SupabaseClient,
  storeId: number,
  items: Array<{ product_id: number }>
): Promise<void> {
  const tags = await resolveOrderStockTags(supabase, storeId, items);
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
