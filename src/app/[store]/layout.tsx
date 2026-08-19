import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { getStoreBySlug } from '@/lib/store/getStoreBySlug';
import { DEFAULT_LOGO_URL } from '@/lib/store/defaultLogo';

type StoreLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chaskyapp.vercel.app';

// El title/OG vive acá, no en el layout raíz (src/app/layout.tsx): el
// generateMetadata de un layout solo recibe params desde la raíz hacia
// abajo hasta el segmento donde él mismo está definido — NO hereda los de
// segmentos dinámicos hijos como [store]. Definirlo en el layout raíz
// (intento anterior) hacía que `store` llegara siempre undefined ahí, y
// todo caía al fallback genérico — confirmado en producción, ambas Stores
// mostraban "Catálogo online" en vez de su propio nombre.
export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  const { store } = await params;
  const data = await getStoreBySlug(supabaseServer, store);

  const title = data?.name ?? 'Catálogo online';
  const logoUrl = data?.logo_url;

  return {
    title,
    description: 'Catálogo de productos - tienda online',
    themeColor: '#000000',
    manifest: `/${store}/manifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title,
    },
    openGraph: {
      title,
      description: 'Catálogo de productos',
      url: `${SITE_URL}/${store}`,
      type: 'website',
      images: [
        {
          url: logoUrl ?? `${SITE_URL}/logo-og.png`,
        },
      ],
    },
    icons: logoUrl
      ? {
          apple: logoUrl,
          icon: [{ url: logoUrl, sizes: '512x512', type: 'image/png' }],
        }
      : {
          apple: '/apple-touch-icon.png',
          icon: [
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
  };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { store } = await params;

  const data = await getStoreBySlug(supabaseServer, store);

  if (!data) {
    notFound();
  }

  return children;
}
