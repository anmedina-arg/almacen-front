import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/login',
        '/register',
        '/auth/',
      ],
    },
    sitemap: 'https://market-del-cevil.vercel.app/sitemap.xml',
  };
}
