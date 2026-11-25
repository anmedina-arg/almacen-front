import type { NextConfig } from 'next';
import { getImageHostRules } from './src/lib/images/imageHosts';

// Los hosts desde los que next/image muestra imágenes remotas viven en una
// sola lista (src/lib/images/imageHosts.ts): la Importación masiva la usa para
// rechazar una imagen_url que rompería el render. Ahí está el detalle de por
// qué se extrae el hostname exacto de Supabase y del bucket compartido en TEST.
const imageRemotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> =
  getImageHostRules().map((rule) => ({
    protocol: 'https' as const,
    hostname: rule.hostname,
    port: '',
    pathname: `${rule.pathPrefix}**`,
  }));

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: imageRemotePatterns,
  },
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
