import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import InstallPWAButton from '@/components/InstallPWAButton';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import PWAInstallTracker from '@/components/PWAInstallTracker';

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "500", "700"]
});

export const metadata: Metadata = {
  title: "Market del cevil",
  description: "Catálogo de productos - tienda online",
  openGraph: {
    title: "Market del cevil",
    description: "Catálogo de productos",
    images: [
      {
        url: "https://market-del-cevil.vercel.app/logo-og.png",
        width: 1200,
        height: 630,
      },
    ],
    url: "https://market-del-cevil.vercel.app",
    type: "website",
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Market Cevil" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body
        className={`${barlow.variable} antialiased`}
      >
        {children}
        <InstallPWAButton />
        <PWAInstallTracker />
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
