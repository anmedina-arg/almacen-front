import type { SupabaseClient } from '@supabase/supabase-js';

export type PublicStore = {
  slug: string;
  name: string;
  logo_url: string | null;
};

/**
 * Stores que cuentan como "negocios que usan chaskyapp" (#153): todas menos
 * la Demo Store. Único lugar que decide esa exclusión — la consumen la
 * página /stores y el sitemap, que antes consultaban `stores` cada uno por
 * su cuenta. Lee con el client que le pasen (anon alcanza: la policy
 * "Anyone can read stores" es pública).
 *
 * Orden por id: la Store más antigua primero, estable entre renders.
 */
export async function listPublicStores(supabase: SupabaseClient): Promise<PublicStore[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('slug, name, logo_url')
    .eq('is_demo', false)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PublicStore[];
}
