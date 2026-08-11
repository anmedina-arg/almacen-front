import type { MetadataRoute } from 'next';

// Modelo multi-tenant por path (ADR-0003): un solo robots.txt para todo el
// dominio, con las Stores como primer segmento del path. Los wildcards cubren
// cualquier cantidad de Stores sin tener que volver a tocar este archivo
// cuando se dé de alta una nueva (ver ADR-0006).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://market-del-cevil.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/admin/',
        '/*/api/',
        '/*/login',
        '/*/register',
        '/*/auth/',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
