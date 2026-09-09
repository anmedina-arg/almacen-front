# PWA: manifest dinámico por Store, Service Worker, íconos

No hay `public/manifest.json` — cada Store sirve el suyo dinámicamente desde `src/app/[store]/manifest/route.ts` (nombre e ícono leídos de `stores.name`/`stores.logo_url`, con `STATIC_ICONS` como fallback si la Store no cargó logo propio). Es un Route Handler común, no el file convention `manifest.ts` de Next.js — ese convention solo soporta la raíz (`app/manifest.ts`), no segmentos dinámicos anidados como `[store]/manifest.ts` (a diferencia de `sitemap.ts`/`opengraph-image.tsx`, que sí). El link al manifest se arma en `generateMetadata()` de `src/app/[store]/layout.tsx` (`/${store}/manifest`), no en el `layout.tsx` raíz — la raíz `/` es el landing multi-store, no es instalable como PWA.

**Nota**: el header rule para `source: '/manifest.json'` en `next.config.ts` no matchea ninguna request real hoy (la ruta real es `/[store]/manifest`) — pendiente de limpieza, no se tocó al escribir esto.

## Service Worker (`public/sw.js`)

Estrategia cache-first, versión en `CACHE_NAME` (`market-cevil-v8` al momento de escribir esto). Para forzar que los clientes tomen una versión nueva: incrementar `CACHE_NAME`. `src/components/ServiceWorkerRegistration.tsx` chequea updates cada 60s (`registration.update()`) y, si detecta una versión instalada nueva, pide confirmación (`confirm()`) antes de recargar — no es un reload silencioso.

## Íconos

Estáticos en `public/` (`icon-192.png`, `icon-512.png`, `icon-192-maskable.png`, `icon-512-maskable.png`, `apple-touch-icon.png`) + `src/app/favicon.ico` (file convention de Next.js, no vive en `public/`). Se regeneran desde `public/logo-og.png` vía `node scripts/generate-icons.js`. Son el fallback (`STATIC_ICONS`) cuando una Store no tiene `logo_url` propio — con logo propio, el manifest de esa Store devuelve ese logo en vez de estos íconos genéricos.

## Testing manual

- **Build + instalación**: `npm run build && npm start`, abrir `/<slug-de-store>` (no la raíz `/`), DevTools → Application → Manifest/Service Workers para confirmar que registran.
- **Offline**: DevTools → Network → Offline, recargar — debería servir desde caché.
- **Lighthouse**: DevTools → Lighthouse → Progressive Web App → Analyze page load.
- **Mobile**: Android (Chrome → menú → "Agregar a pantalla de inicio"), iOS (Safari → compartir → "Agregar a la pantalla de inicio").

## Troubleshooting

- **Service Worker no registra**: requiere HTTPS o `localhost`; revisar consola del navegador; confirmar que `sw.js` está en `public/`.
- **Manifest no se detecta**: no busques `public/manifest.json` (no existe) — verificar `/<slug-de-store>/manifest` responde 200 y que `generateMetadata()` en `[store]/layout.tsx` arma el link correcto.
- **No funciona offline**: confirmar que el Service Worker está activo y qué recursos están cacheados (DevTools → Application → Cache Storage) — revisar `PRECACHE_URLS` en `sw.js`.
