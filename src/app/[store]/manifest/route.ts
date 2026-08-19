import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const STATIC_ICONS = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

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
    .select('name, logo_url')
    .eq('slug', store)
    .maybeSingle();

  const name = data?.name ?? store;
  const logoUrl = data?.logo_url;

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
      icons: logoUrl
        ? [
            { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ]
        : STATIC_ICONS,
      categories: ['shopping', 'business'],
      prefer_related_applications: false,
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        // El nombre de una Store cambia solo por edición manual de un
        // Platform admin (ADR-0006) — mucho más raro que el catálogo de
        // productos, que ya cachea 5min/1h (ver [store]/api/products/route.ts).
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
