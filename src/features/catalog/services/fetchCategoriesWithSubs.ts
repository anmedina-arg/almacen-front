import 'server-only';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CategoryWithSubsPublic } from '../types/category.types';

/**
 * Fetches all active categories with their subcategories for a Store,
 * ordered by sort_order.
 *
 * Wrapped with React cache() so multiple Server Components calling this
 * within the same request (CategoryNav + ProductCatalogLoader) share a
 * single Supabase query — cache() memoiza por argumento, así que agregar
 * storeId sigue deduplicando correctamente.
 */
export const fetchCategoriesWithSubs = cache(async (storeId: number): Promise<CategoryWithSubsPublic[]> => {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('categories')
    .select('id, name, image_url, sort_order, subcategories(id, name, sort_order)')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true });

  return ((data ?? []) as CategoryWithSubsPublic[]).map((cat) => ({
    ...cat,
    subcategories: [...cat.subcategories].sort((a, b) => a.sort_order - b.sort_order),
  }));
});
