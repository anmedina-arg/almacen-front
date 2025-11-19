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
      <body
        className={`${barlow.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
