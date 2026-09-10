---
status: accepted
---

# Cache del catálogo público por volatilidad, no como una sola foto

Diagnóstico de performance (sesión de grilling, 2026-09-09, ver `docs/diagnostics/2026-09-perf.md`) encontró que `fetchPublicProducts()` no tiene ningún cache — corre en cada visita SSR y en cada tecla de búsqueda 4-5 queries, incluida una que cruza pedidos de todas las Stores del deployment multi-tenant. La opción obvia (cachear el resultado completo como una sola unidad, invalidada en cada pedido) fue evaluada y rechazada: con la rotación real de stock de una Store como Market del Cevil (mucho catálogo, pero cualquier producto puntual se vende con poca frecuencia relativa), invalidar todo el catálogo por cada pedido individual tira la mayor parte del beneficio del cache — la próxima visita recalcula todo de nuevo aunque solo haya rotado un producto de 550.

## Decisión

Cachear el catálogo público en piezas independientes, separadas por qué tan seguido cambia cada una — no como una unidad:

- **Metadata de producto** (nombre, precio, categoría, composición de combos): cambia solo cuando el admin edita el catálogo. Cache de vida larga, invalidado solo al editar/crear/borrar un producto.
- **Stock**: la única pieza realmente volátil, y solo para los productos que efectivamente se venden. Cacheado *por producto* (no por catálogo completo) — al confirmarse un pedido, se invalida únicamente el stock de los productos de esa orden, nunca el resto del catálogo.
- **Badge "Más vendido"** (`get_top_seller_ids`, ventana de 30 días): no necesita invalidación por evento en absoluto — se recalcula por job diario, totalmente desacoplado de cada pedido individual. El bug de aislamiento que este RPC tenía (no scopeado por `store_id`, violando ADR-0004) se corrigió en #142 — fuera del alcance de este ADR, que solo cubre la estrategia de cache.

Mecánicamente en Next.js: tags de cache granulares (`revalidateTag`) por pieza — no un único `revalidate`/TTL fijo para toda `fetchPublicProducts()`.

## Considered Options

**Cache único con TTL fijo (ej. 30-60s) para todo el resultado de `fetchPublicProducts()`.** Rechazado: escala mal con volumen de pedidos — cualquier venta de cualquier producto invalida el catálogo completo, sin importar cuán infrecuente sea esa venta relativa al tamaño del catálogo. Es más simple de implementar, pero devuelve la mayoría del ahorro de queries que se buscaba con el cache.

## Consequences

- `fetchPublicProducts()` deja de ser una función monolítica que trae todo junto — se parte en piezas independientemente cacheables (metadata / stock / top-seller), cada una con su propio trigger de invalidación.
- Requiere invalidación por evento (`revalidateTag`) en `create_order()` (o el service que lo envuelve) y en los endpoints de administración de productos/stock — no alcanza con un TTL pasivo.
- El stock mostrado en el catálogo público puede quedar desactualizado por el tiempo que tarde la invalidación en propagarse tras un pedido — aceptable porque el Descuento de stock (ver `CONTEXT.md`) ya es la fuente de verdad al momento de confirmar un pedido nuevo: `create_order()` rechaza si el stock real no alcanza, independientemente de lo que mostraba el catálogo cacheado.

## Actualización 2026-09-10 (#148) — el cache por producto de stock no escala al catálogo completo

`perf_logs` en producción mostró que el cache por producto de stock, tal como quedó implementado en #146, dejaba `catalog_ssr` (la carga inicial sin filtros, ~550 productos) **más lenta** que antes de #145-147, no más rápida: el overhead de invocar `unstable_cache` cientos de veces por request (cache-hit o no) superaba el costo de un único query bulk.

La estrategia de cache por volatilidad de este ADR sigue vigente sin cambios para metadata y top-seller, y para stock cuando el resultado es chico (búsqueda, paginación por categoría) — ahí el cache per-producto (#146) sí gana. Se agrega una tercera rama, solo para stock y solo cuando el resultado es el catálogo completo (sin `categoryId` ni `search`): un único query bulk, sin `unstable_cache`, recalculado en cada request. Cachear ese resultado como una sola unidad reintroduciría el problema de blast-radius que #146 vino a resolver (un pedido de un producto invalidaría el stock de los 550), así que se prefiere no cachearlo — el costo de un query bulk fresco por request es bajo (un solo roundtrip) comparado con las ~550 lecturas de cache que reemplaza.
