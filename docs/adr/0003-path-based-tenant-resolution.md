# Resolución de Store por path, no por subdominio

Sin un dominio propio comprado, los subdominios wildcard (`cliente.marketcevil.com`) no son viables sobre el dominio compartido `*.vercel.app` — Vercel no permite wildcards de terceros ahí. Se optó por resolver la Store activa mediante el primer segmento del path (`mi-producto.vercel.app/market-del-cevil`) en lugar de esperar a comprar un dominio propio para hacer subdominios (el patrón más común en SaaS).

Esto implica:

- El proyecto Vercel se renombra a un nombre neutro, no ligado a la marca de ninguna Store cliente (evita que la URL de un cliente muestre el nombre de otro negocio del mismo rubro).
- Todo el árbol de rutas de la app (`admin`, `login`, `register`, `auth`, catálogo) se anida bajo un segmento dinámico `src/app/[store]/...`. Esto además elimina la necesidad de una lista extensa de slugs reservados (ya no hay colisión con rutas de nivel raíz como `/admin`).
- Las rutas de `/api/*` se anidan también bajo `/[store]/api/*` (no quedan planas): así cada endpoint recibe el slug directo como route param, igual que cualquier página, sin necesitar un mecanismo aparte (evaluado y descartado: derivar el slug del header `Referer` en un middleware plano es frágil — no todos los clientes/proxies lo mandan, y una API llamada fuera del contexto de una página no tendría de dónde sacarlo). El middleware igual extrae el slug del primer segmento del path e inyecta `x-store-slug` como header en toda request bajo `/[store]/*` — pensado para desacoplar a futuro la resolución de Store del path (ej. si se migra a subdominio/dominio propio) sin que el código que lo consume dependa de cómo se resolvió. `/api/health/*` es la única excepción: vive fuera de `/[store]` por ser un endpoint de monitoreo sin Store asociada.
- La raíz `/` (sin slug) queda reservada para una landing de marketing del producto en sí, no para una Store.

## Consequences

Migrar de path-based a subdominios más adelante (si se compra un dominio propio) requeriría reescribir enlaces ya compartidos por clientes (catálogos, links de WhatsApp) — es una decisión reversible pero con costo de migración real, no gratis.
