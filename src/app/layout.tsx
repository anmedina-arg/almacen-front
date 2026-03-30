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

export const metadata: Metadata = {
  title: 'Market del cevil',
  description: 'Catálogo de productos - tienda online',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Market Cevil',
  },
  openGraph: {
    title: 'Market del cevil',
    description: 'Catálogo de productos',
    url: 'https://market-del-cevil.vercel.app',
    type: 'website',
    images: [
      {
        url: 'https://market-del-cevil.vercel.app/logo-og.png',
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
      <head>
        {/* Preload del logo — crítico para LCP. URL debe ser idéntica a la de Header.tsx.
            Con unoptimized: true, next/image no genera este preload automáticamente. */}
        <link
          rel="preload"
          as="image"
          href="https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto,w_256/v1763599423/logo-og_pydhrd.png"
          fetchPriority="high"
        />
      </head>
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
