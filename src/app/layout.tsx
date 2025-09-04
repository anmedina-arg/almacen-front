import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';

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
