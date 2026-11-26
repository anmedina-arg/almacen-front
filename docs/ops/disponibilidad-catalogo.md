# Disponibilidad del catálogo público

El catálogo de cada Store (`/<slug>`) es lo que ven los clientes: tiene que seguir arriba aunque falle otra parte de la app. Qué lo protege y qué queda como riesgo conocido (análisis de 2026-11-26, ticket #190).

## Qué lo protege

- **Degradación por pieza:** productos, stock y más vendidos caen a "sin datos" si su consulta falla y no cachean el resultado malo.
- **Metadata de productos cacheada** (`unstable_cache`, invalidada por evento con `revalidateTag`).
- **Datos de la Store** (`getStoreBySlug`): cacheados 60 s con revalidación en segundo plano. Un fallo de la base **no** se confunde con "la Store no existe": solo lo segundo da 404; lo primero sirve el último valor bueno o, sin valor, el error boundary con "Reintentar".
- **Error boundaries:** `src/app/[store]/error.tsx` y `src/app/global-error.tsx`.
- **Middleware:** si Supabase Auth falla, la request se trata como anónima. El catálogo sigue; `/admin` y `/profile` redirigen al login (cierra seguro).
- **Service worker:** ante 5xx o 404 de una navegación sirve la última copia cacheada de esa página (además de ante falta de red).

## Monitoreo externo (configurar a mano)

No hay nada que consulte la app desde afuera, así que hoy el aviso lo da un cliente. Configurar un chequeo gratuito (UptimeRobot, Better Stack o similar):

- URL: la home de una Store real, ej. `https://chaskyapp.vercel.app/market-del-cevil`, cada 5 minutos, esperando HTTP 200 y que el cuerpo contenga el nombre de la Store.
- Opcional, para distinguir "cayó la base" de "cayó la app": `https://chaskyapp.vercel.app/api/health/supabase` (devuelve `ok: true` o 500).
- Avisos por email/WhatsApp al admin de la plataforma.

## Riesgos que siguen abiertos

- **Una sola base Supabase para todo** (catálogo, admin, reportes, importaciones, imágenes). Si cae, el catálogo cae salvo por el último valor cacheado. Mitigación estructural pendiente: renderizar el catálogo desde caché con revalidación por evento, y plan de Supabase con más recursos.
- **El SQL de producción se aplica directo, sin staging.** El catálogo depende de `products`, `product_stock`, `categories`, `effective_price`, `get_available_stock` y `get_top_seller_ids`: un cambio en cualquiera pega al instante. Antes de borrar una columna de `products`, el código desplegado en `main` no puede seguir leyéndola.
- **Cada visita renderiza en el servidor** (3-4 consultas): un pico de tráfico va directo a la base.
