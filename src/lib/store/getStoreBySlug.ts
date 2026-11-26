import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { lookupStoreBySlug, type StoreBySlug } from './lookupStoreBySlug';

export type { StoreBySlug };

// Cuánto vive el dato de la Store (nombre, logo, WhatsApp, demo) en el cache
// de Next. No hay invalidación por evento: estos campos casi no cambian y un
// minuto de atraso es aceptable. Pasado el minuto, Next sirve el valor viejo
// y lo refresca en segundo plano (stale-while-revalidate): si la base falla
// justo ahí, el catálogo sigue con el último valor bueno (#190).
const STORE_REVALIDATE_SECONDS = 60;

/**
 * Resuelve id + name + logo_url + whatsapp_number + is_demo de una Store por slug.
 * Devuelve null solo si la Store no existe; si la consulta falla y no hay valor
 * cacheado, tira error (ver lookupStoreBySlug).
 *
 * Dos capas: unstable_cache (entre requests, sobrevive a una caída corta de la
 * base) y cache() de React (dentro de un mismo request, generateMetadata y el
 * layout de [store] comparten el resultado).
 *
 * Usa siempre supabaseServer (anon, sin sesión): stores tiene lectura pública y
 * un unstable_cache no puede depender de las cookies del request.
 */
export const getStoreBySlug = cache(async (slug: string): Promise<StoreBySlug | null> => {
  const cached = unstable_cache(
    () => lookupStoreBySlug(supabaseServer, slug),
    ['store-by-slug', slug],
    { revalidate: STORE_REVALIDATE_SECONDS }
  );
  return cached();
});
