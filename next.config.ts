import type { NextConfig } from 'next';

// Extraer el hostname exacto de la URL de Supabase para que Next.js
// pueda optimizar imágenes servidas desde Supabase Storage.
// El wildcard *.supabase.co no matchea correctamente en todos los entornos.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

// Las imágenes nunca se duplican entre entornos — en TEST, los product_stock/
// categories seedeados siguen apuntando al bucket de storage de producción.
// NEXT_PUBLIC_IMAGE_STORAGE_URL (opcional, ver .env.test.example) whitelistea
// ese segundo host solo cuando está seteada; en producción no hace falta
// (supabaseHostname ya es el mismo bucket real).
const imageStorageHostname = process.env.NEXT_PUBLIC_IMAGE_STORAGE_URL
  ? new URL(process.env.NEXT_PUBLIC_IMAGE_STORAGE_URL).hostname
  : undefined;

const imageRemotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
  {
    protocol: 'https',
    hostname: supabaseHostname,
    port: '',
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
    port: '',
    pathname: '/**',
  },
];

if (imageStorageHostname && imageStorageHostname !== supabaseHostname) {
  imageRemotePatterns.push({
    protocol: 'https',
    hostname: imageStorageHostname,
    port: '',
    pathname: '/storage/v1/object/public/**',
  });
}

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
