---
status: accepted
---

# Dominios de la capa de servicios y su shared kernel

`src/features/` hoy se organiza por superficie de UI (`admin`, `catalog`, `auth`), no por dominio de negocio — `features/admin/services/` mete 7 dominios distintos (categorías, combos, familias, orders, ranking, stock, products) en una sola carpeta. `supabase/schema/` ya está organizado por dominio desde el mapa [#74](https://github.com/anmedina-arg/almacen-front/issues/74) (9 carpetas: `clients`, `combos`, `orders`, `producto-surtido`, `products`, `ranking`, `recomendaciones`, `stock`, `store`), con la intención explícita (issue #78 de ese mapa) de que `src/features/` reflejara el mismo principio — nunca se hizo. Este ADR fija esos límites para la capa de servicios, resuelto en el mapa [#105](https://github.com/anmedina-arg/almacen-front/issues/105), ticket [#108](https://github.com/anmedina-arg/almacen-front/issues/108).

## Decisión

Los dominios de la capa de servicios (futuras carpetas `src/features/<dominio>/`):

- **Products** — productos, categorías, subcategorías, y el catálogo público (que deja de ser una carpeta `catalog` propia, es la cara pública de este dominio). Anida dos sub-módulos con service propio pero sin carpeta de nivel superior: **Combos** (`combo_components`, stock derivado por fórmula) y **Producto Surtido** (`familias`/`variedades`) — tienen tabla e invariantes propias, pero se crean desde la misma pantalla de gestión de productos, no desde una pantalla propia.
- **Orders** — ciclo de vida del pedido. **POS** no es un dominio propio, es otro punto de entrada al mismo `create_order`.
- **Stock**
- **Clients**
- **Store/Platform** — tenancy, feature flags, membresía de admin, provisioning. Nuevo como carpeta propia (hoy disperso).
- **Ranking**, **Recomendaciones/Informes**, **Dashboard** — categoría "reporting": ninguno posee tablas propias, solo agregan datos de otros dominios. Se mantienen como 3 dominios delgados separados (coincide con 3 páginas/flags independientes), no fusionados en uno solo.

**Shared kernel**: se extrae de `features/auth/utils/` hacia `src/lib/auth/` — ahí es donde ya vive el resto de la infraestructura que todo dominio importa (`src/lib/api`, `src/lib/store`, `src/lib/supabase`). Incluye `withStoreAdmin`, `verifyStoreAdminAuth`. `features/auth/` queda como dominio delgado propio solo para el flujo de UI de sesión/login (`/login`, `/register`) — no para los guards que otros dominios importan.

**Composición de guards para rutas de API** (resuelto en ticket [#111](https://github.com/anmedina-arg/almacen-front/issues/111), revisa la ubicación fijada arriba): en vez de anidar wrappers (`withStoreAdmin(withFeatureFlag(...))`, cada uno resolviendo `storeId` por su cuenta), una pipeline de guards contra un contexto compartido — `createApiRoute(...guards)(handler)`, que resuelve `storeId` una sola vez y corre cada guard en orden contra ese contexto, cortando en el primero que falla. Vive en `src/lib/api/` (junto a `apiFetch.ts`, la contraparte cliente). Cada guard concreto vive en el dominio al que pertenece conceptualmente, no en `src/lib/api/`: `requireAdmin` en `src/lib/auth/` (envuelve a `withStoreAdmin`/`verifyStoreAdminAuth`), `requireFlag(flag)` en `src/lib/store/` (junto a `featureFlags.ts`, `getStoreFeatureFlags.ts` — feature flags son un concepto de Store, no de auth, corrección respecto a la primera versión de este ADR). Sin librería nueva (se evaluó tRPC — rechazado: ya decidimos en [#107](https://github.com/anmedina-arg/almacen-front/issues/107) que RSC llama al service directo sin pasar por HTTP, así que tRPC solo cubriría la mitad del transporte; además complicaría el caching HTTP que ya usa `GET /api/products` en producción). El tenant-scoping helper que produzca el prototipo de `categories` ([#109](https://github.com/anmedina-arg/almacen-front/issues/109)) se suma a esta misma pipeline como un guard más, no como un wrapper aparte.

**Validación de flags en dos capas, no una sola**: ninguna de las 8 flags se aplica hoy server-side (ni siquiera las 5 que gatean página completa — solo el redirect de página o el botón oculto las hace cumplir). La UI sigue sin ofrecer lo que un Store no tiene (nav/botones condicionados, ya así hoy) — pero el servidor tiene que rechazar igual si el request llega, porque `withStoreAdmin` confirma que sos admin *de ese Store*, no que ese Store pagó por *esa capacidad*. No confiar en que el cliente nunca mande el request.

## Considered Options

Mantener 1:1 los 9 dominios de `supabase/schema/` como carpetas de nivel superior en `src/features/` (Combos y Producto Surtido incluidos). Rechazado: la profundidad de anidamiento de la capa de servicios debe reflejar el flujo de trabajo del admin (dueño de tabla propia no implica pantalla propia ni carpeta de nivel superior), no solo la propiedad de tabla — ese criterio es correcto para organizar SQL por archivo, pero demasiado fino para organizar código de aplicación que se navega por feature.

## Consequences

- [ADR-0012](./0012-feature-flags-mutual-independence.md) había dejado abierta, deliberadamente, la pregunta de si `combos` debía dejar de ser feature flag — queda resuelta acá: sí, se retira como flag (ver issue de seguimiento para el cambio de código, fuera de este mapa por ser ejecución, no decisión).
- La migración real de código (mover archivos, actualizar imports en las ~30 rutas que llaman Supabase directo) queda para después de que el mapa #105 cierre — este ADR fija el destino, no ejecuta el movimiento.
