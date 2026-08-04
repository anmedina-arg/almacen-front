# Resolución de Store por path, no por subdominio

Sin un dominio propio comprado, los subdominios wildcard (`cliente.marketcevil.com`) no son viables sobre el dominio compartido `*.vercel.app` — Vercel no permite wildcards de terceros ahí. Se optó por resolver la Store activa mediante el primer segmento del path (`mi-producto.vercel.app/market-del-cevil`) en lugar de esperar a comprar un dominio propio para hacer subdominios (el patrón más común en SaaS).

Esto implica:

- El proyecto Vercel se renombra a un nombre neutro, no ligado a la marca de ninguna Store cliente (evita que la URL de un cliente muestre el nombre de otro negocio del mismo rubro).
- Todo el árbol de rutas de la app (`admin`, `login`, `register`, `auth`, catálogo) se anida bajo un segmento dinámico `src/app/[store]/...`. Esto además elimina la necesidad de una lista extensa de slugs reservados (ya no hay colisión con rutas de nivel raíz como `/admin`).
- Las rutas de `/api/*` quedan planas (no anidadas); el middleware extrae el slug del primer segmento del path de la página que originó el request y lo inyecta como header (`x-store-slug`) para que los endpoints filtren por Store sin duplicarse.
- La raíz `/` (sin slug) queda reservada para una landing de marketing del producto en sí, no para una Store.

## Consequences

Migrar de path-based a subdominios más adelante (si se compra un dominio propio) requeriría reescribir enlaces ya compartidos por clientes (catálogos, links de WhatsApp) — es una decisión reversible pero con costo de migración real, no gratis.
