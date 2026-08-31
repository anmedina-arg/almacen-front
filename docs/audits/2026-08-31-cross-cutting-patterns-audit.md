# Auditoría de patrones cross-cutting duplicados

Parte del wayfinder ticket [#106](https://github.com/anmedina-arg/almacen-front/issues/106),
child del mapa [#105 — Arquitectura de capa de servicios](https://github.com/anmedina-arg/almacen-front/issues/105).

Cataloga patrones repetidos a mano en vez de centralizados, encontrados al recorrer los `route.ts`
bajo `src/app/[store]/api/**` y `src/features/*/services/*.ts`. No propone solución — eso es del
ticket de definir dominios/shared kernel que este audit desbloquea. Excluye lo ya confirmado
antes de este audit: tenant-scoping (`.eq('store_id')`, 54 ocurrencias) y admin-check (ya
centralizado en `withStoreAdmin`, no es un problema).

## Shape de response inconsistente en éxito

No hay una convención única para el body de una respuesta exitosa de mutación. Se encontraron
al menos 4 formas distintas:

- `{ ok: true }` — `src/app/[store]/api/admin/recommendations/refresh/route.ts:20`
- `{ message: 'Components updated successfully' }` — `src/app/[store]/api/combos/[id]/components/route.ts:160`
- `{ success: true }` — `src/app/[store]/api/orders/[orderId]/items/[itemId]/route.ts:58`
- `{ message: 'Product deleted successfully' }` — `src/app/[store]/api/products/[id]/route.ts:271`
- Plus el body de datos crudo en la mayoría de los GET, y `204 No Content` en `categories/reorder`.

El shape de error sí es consistente (`{ error: string }` con status HTTP), solo el de éxito varía.

## Cobertura de validación incompleta

6 rutas con `POST`/`PUT`/`PATCH` no tienen ninguna validación zod (ni `safeParse` ni `z.object`
importado), aceptan el body tal cual llega:

- `src/app/[store]/api/admin/recommendations/refresh/route.ts`
- `src/app/[store]/api/combos/[id]/components/route.ts`
- `src/app/[store]/api/orders/[orderId]/cancel/route.ts`
- `src/app/[store]/api/orders/[orderId]/confirm/route.ts`
- `src/app/[store]/api/products/route.ts` (POST — crea producto, incluye precio/costo)
- `src/app/[store]/api/products/[id]/route.ts` (PUT — edita precio/costo)

Las dos últimas son las más sensibles: mutan precio y costo sin pasar por schema.

## Ubicación de schemas zod inconsistente

Donde sí hay validación (19 de 41 rutas), 4 la definen inline con `z.object(...)` dentro del
propio `route.ts` en vez de importarla de `features/*/schemas/` como el resto del proyecto:

- `src/app/[store]/api/categories/reorder/route.ts`
- `src/app/[store]/api/categories/[id]/subcategories/reorder/route.ts`
- `src/app/[store]/api/categories/[id]/subcategories/route.ts`
- `src/app/[store]/api/subcategories/[id]/route.ts`

## Conversión de unidades (kg/100gr) reimplementada a mano

Existe un helper canónico en `src/utils/productUtils.ts:17-19` (`case '100gr'`, `case 'kg'`,
`default`) — pero 2 rutas de dashboard reimplementan el mismo `switch`/`case` con la misma
fórmula en vez de importarlo:

- `src/app/[store]/api/dashboard/stock-by-category/route.ts:47-49`
- `src/app/[store]/api/dashboard/stock-products/route.ts:54-56`

No es un caso de "falta el util" — el util existe y no se está reusando.

## Constante de timezone duplicada

`AR_OFFSET_MS = 3 * 60 * 60 * 1000` (offset Argentina para calcular límites de "día") está
copiada literal en 3 archivos en vez de un solo lugar compartido:

- `src/app/[store]/api/dashboard/rotation/route.ts:21`
- `src/app/[store]/api/dashboard/rotation/snapshots/route.ts:31`
- `src/app/[store]/api/dashboard/stock-value-history/route.ts:21`

## N+1 en escrituras (una query/RPC por fila)

Además del ya confirmado `categories/reorder` (un `UPDATE` por categoría), se encontró un segundo
caso del mismo patrón:

- `src/app/[store]/api/stock/entry/route.ts:30-53` — `Promise.all(entries.map(async entry =>
  supabase.rpc('increment_product_stock', ...)))`: una llamada RPC por entrada de stock en vez de
  una función que reciba el lote completo. Matiz: es explícitamente "best-effort" (si una entrada
  falla, las demás igual se aplican y el resultado por-item se devuelve al cliente) — una versión
  batch tendría que preservar ese comportamiento por-fila, no es un swap directo a una sola query.

## Paginación ad-hoc y no generalizada

Solo 4 de 41 rutas usan `.range(`/`.limit(` para paginar (`categories`,
`categories/[id]/subcategories`, `dashboard/rotation`, `dashboard/rotation/snapshots`); el resto
devuelve el resultado completo sin paginar. No hay una convención compartida de paginación —
donde existe, cada ruta la arma a mano.

## Lo que ya está bien (no son hallazgos, es contexto)

- Admin-check: 40/41 rutas usan `withStoreAdmin` — centralizado correctamente.
- Resolución de storeId: ninguna ruta bajo `[store]/api/` resuelve el store por su cuenta fuera
  de `withStoreAdmin`/`getStoreIdBySlug`.
