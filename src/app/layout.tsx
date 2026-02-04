'use client';

import { Barlow } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import InstallPWAButton from '@/components/InstallPWAButton';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import PWAInstallTracker from '@/components/PWAInstallTracker';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/components/AuthProvider';

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "500", "700"]
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Market del cevil</title>
        <meta name="description" content="Catálogo de productos - tienda online" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Market Cevil" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* OpenGraph tags */}
        <meta property="og:title" content="Market del cevil" />
        <meta property="og:description" content="Catálogo de productos" />
        <meta property="og:image" content="https://market-del-cevil.vercel.app/logo-og.png" />
        <meta property="og:url" content="https://market-del-cevil.vercel.app" />
        <meta property="og:type" content="website" />
      </head>
      <body
        className={`${barlow.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
        </QueryClientProvider>
        <InstallPWAButton />
        <PWAInstallTracker />
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
