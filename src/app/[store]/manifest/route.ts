import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Next.js reserva el file convention `manifest.ts` SOLO para app/manifest.ts
// (la raíz) — no soporta segmentos dinámicos anidados como /[store]/manifest.ts
// (a diferencia de sitemap.ts u opengraph-image.tsx, que sí). Por eso el
// manifest por Store se sirve con un Route Handler normal, referenciado desde
// generateMetadata() en src/app/[store]/layout.tsx.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ store: string }> }
) {
  const { store } = await params;

  const { data } = await supabaseServer
    .from('stores')
    .select('name')
    .eq('slug', store)
    .maybeSingle();

  const name = data?.name ?? store;

  return NextResponse.json(
    {
      name,
      short_name: name,
      description: `Catálogo de productos - ${name}`,
      start_url: `/${store}`,
      scope: `/${store}`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      orientation: 'portrait-primary',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      categories: ['shopping', 'business'],
      prefer_related_applications: false,
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
