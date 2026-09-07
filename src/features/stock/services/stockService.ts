import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProductStockView,
  StockMovement,
  LowStockProduct,
  StockEntryInput,
  StockEntryResult,
} from '@/features/admin/types/stock.types';
import type { StockUpdateInput } from '../schemas/stockUpdateSchema';
import { NotFoundError } from '@/lib/api/errors';

/**
 * Service del dominio Stock (#122) — ver ADR-0013, mismo patrón que
 * productService.ts/orderService.ts. Cada función recibe storeId
 * explícito.
 */

export async function getAllProductsWithStock(supabase: SupabaseClient, storeId: number): Promise<ProductStockView[]> {
  const { data, error } = await supabase.rpc('get_all_products_with_stock', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertProductStock(
  supabase: SupabaseClient,
  storeId: number,
  productId: number,
  input: StockUpdateInput
): Promise<unknown> {
  const { data, error } = await supabase.rpc('upsert_product_stock', {
    p_product_id: productId,
    p_quantity: input.quantity,
    p_min_stock: input.minStock,
    p_notes: input.notes || null,
    p_movement_type: input.movementType,
    p_store_id: storeId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getStockHistory(supabase: SupabaseClient, storeId: number, productId: number): Promise<StockMovement[]> {
  // Se valida contra products.store_id (confiable) en vez de filtrar
  // stock_movement_log por su propio store_id como único criterio: evita
  // que un admin de otra Store vea el historial de un product_id ajeno
  // adivinando el id. store_id en stock_movement_log ya lo setean los
  // triggers desde #52 (resuelto, aplicado en producción 2026-08-24) — se
  // suma igual como filtro de defensa en profundidad, no reemplaza el
  // chequeo de ownership de arriba.
  const { data: product } = await supabase.from('products').select('id').eq('id', productId).eq('store_id', storeId).maybeSingle();
  if (!product) throw new NotFoundError('Product not found in this store');

  const { data, error } = await supabase
    .from('stock_movement_log')
    .select('*')
    .eq('product_id', productId)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLowStockProducts(supabase: SupabaseClient, storeId: number): Promise<LowStockProduct[]> {
  const { data, error } = await supabase.rpc('get_low_stock_products', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Ingreso de stock por lote — un solo round-trip vía
 * increment_product_stock_batch() (#122, arregla el N+1 del audit #106:
 * antes era un supabase.rpc('increment_product_stock', ...) por entrada
 * desde el cliente TS vía Promise.all). Best-effort por fila preservado
 * DENTRO de la función SQL (cada entrada corre en su propio bloque
 * BEGIN/EXCEPTION — un savepoint implícito de Postgres, así que la fila
 * que falla no revierte ni frena a las demás) — ver
 * supabase/schema/stock/increment_product_stock_batch.sql para el detalle
 * y el porqué de esta convención en vez de N llamadas RPC separadas.
 */
export async function batchIncrementStock(
  supabase: SupabaseClient,
  storeId: number,
  entries: StockEntryInput[]
): Promise<StockEntryResult[]> {
  const { data, error } = await supabase.rpc('increment_product_stock_batch', {
    p_entries: entries.map((e) => ({ product_id: e.product_id, increment: e.increment, notes: e.notes || null })),
    p_store_id: storeId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}
