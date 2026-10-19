import type { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { listPublicStores, type PublicStore } from '@/features/store/services/listPublicStores';

// Genera 3 entradas por cada Store activa en vez de hardcodear una — cuando
// se dé de alta una Store nueva (ADR-0006), aparece sola en el próximo build
// sin tocar este archivo. La Demo Store no entra (#153): misma función de
// listado que la página /stores.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chaskyapp.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let stores: PublicStore[] = [];
  try {
    stores = await listPublicStores(supabaseServer);
  } catch (error) {
    // Sitemap vacío antes que un build roto por una consulta fallida.
    console.error('[sitemap] no se pudo listar las Stores:', error);
  }

  const lastModified = new Date();

  return stores.flatMap((store) => [
    {
      url: `${SITE_URL}/${store.slug}`,
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${SITE_URL}/${store.slug}/privacy`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/${store.slug}/terms`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ]);
}
