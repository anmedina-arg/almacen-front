import type { Metadata } from 'next';
import { Barlow } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { PWAInstallTracker } from '@/components/PWAInstallTracker';
import { Providers } from '@/components/Providers';

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['300', '500', '700'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chaskyapp.vercel.app';

// Fallback generico para la raiz "/" (landing sin Store, ver src/app/page.tsx)
// y cualquier ruta fuera de /[store]/*. El title/OG real por Store vive en
// src/app/[store]/layout.tsx: el generateMetadata de un layout solo recibe
// params desde la raiz hacia abajo hasta donde el mismo esta definido - NO
// hereda los de segmentos dinamicos hijos como [store]. Tenerlo aca (intento
// anterior) hacia que `store` llegara siempre undefined, y ambas Stores
// mostraban este mismo fallback en vez de su propio nombre - confirmado en
// produccion tras el deploy, no solo en teoria.
export const metadata: Metadata = {
  title: 'Catálogo online',
  description: 'Catálogo de productos - tienda online',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Catálogo online',
  },
  openGraph: {
    title: 'Catálogo online',
    description: 'Catálogo de productos',
    url: SITE_URL,
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
