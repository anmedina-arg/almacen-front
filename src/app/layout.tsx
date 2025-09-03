import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans, Barlow } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "500", "700"]
});

export const metadata: Metadata = {
  title: "La proveduria - Lista de Precios y Productos",
  description: "Catálogo de productos con sistema de pedidos por WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${barlow.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
