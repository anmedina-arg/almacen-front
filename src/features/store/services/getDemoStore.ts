import type { SupabaseClient } from '@supabase/supabase-js';

export type DemoStore = {
  slug: string;
  name: string;
};

/**
 * La Demo Store (#153) que la landing muestra en /demo. Se resuelve por la
 * marca `is_demo`, no por un slug fijo: así la UI y el resto del sistema
 * (/stores, sitemap, /admin) identifican la demo por la misma propiedad y
 * no pueden divergir. Si hubiera más de una Store marcada, gana la más
 * antigua; si no hay ninguna, null (la demo todavía no fue dada de alta).
 */
export async function getDemoStore(supabase: SupabaseClient): Promise<DemoStore | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('slug, name')
    .eq('is_demo', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as DemoStore | null) ?? null;
}
