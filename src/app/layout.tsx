import type { Metadata } from 'next';
import { Barlow } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { PWAInstallTracker } from '@/components/PWAInstallTracker';
import { Providers } from '@/components/Providers';
import { supabaseServer } from '@/lib/supabase/server';

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['300', '500', '700'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chaskyapp.vercel.app';

// title/OG están acá (layout raíz) en vez de en src/app/[store]/layout.tsx
// porque generateMetadata de un layout padre también recibe los params de
// segmentos dinámicos hijos ya matcheados (acá, [store]) — no hace falta que
// el layout los declare él mismo. Sin esto, cualquier Store que no sea la
// primera cargada mostraba la marca de otra Store en el title/OG (bug real,
// detectado al probar el alta de una segunda Store).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ store?: string }>;
}): Promise<Metadata> {
  const { store } = await params;

  let storeName: string | null = null;
  if (store) {
    const { data } = await supabaseServer
      .from('stores')
      .select('name')
      .eq('slug', store)
      .maybeSingle();
    storeName = data?.name ?? null;
  }

  const title = storeName ?? 'Catálogo online';
  const ogUrl = store ? `${SITE_URL}/${store}` : SITE_URL;

  return {
    title,
    description: 'Catálogo de productos - tienda online',
    themeColor: '#000000',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title,
    },
    openGraph: {
      title,
      description: 'Catálogo de productos',
      url: ogUrl,
      type: 'website',
      images: [
        {
          url: `${SITE_URL}/logo-og.png`,
        },
      ],
    },
    icons: {
      apple: '/apple-touch-icon.png',
      icon: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className={`${barlow.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <InstallPWAButton />
        <PWAInstallTracker />
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
