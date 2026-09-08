# Rutas de API admin-gated: usar el guard compartido, no reimplementarlo

Toda ruta bajo `src/app/[store]/api/**/route.ts` que requiera ser Store admin o Platform admin para ejecutarse tiene que usar el guard compartido — nunca reimplementar el chequeo a mano ni armar el `403`/`401` inline.

**Un solo patrón vigente desde que cerró la migración de #114/#127 (ADR-0013):** `createApiRoute(requireAdmin)` (`src/lib/api/createApiRoute.ts` + `src/lib/auth/requireAdmin.ts`). Las 41 rutas de API del repo usan `createApiRoute` — confirmado sin ningún call site vivo de `withStoreAdmin` (`src/features/auth/utils/apiAuth.ts`) fuera de su propio test. `withStoreAdmin` es código muerto hoy — nada lo llama, es candidato a borrar junto con su test.

**Distinto de `verifyStoreAdminAuth`** (`src/features/auth/utils/roleHelpers.ts`, la función que `withStoreAdmin` envolvía): esa sí sigue viva, pero fuera del alcance de este documento — la usa `src/app/[store]/admin/layout.tsx` como gate de página (Server Component, corre en cada carga de `/admin/*`, redirige a login o a "unauthorized"), no una ruta de API. `requireAdmin` no la reemplaza — reimplementa el mismo chequeo de 2 pasos (usuario + `resolveStoreAdminStatus`, el núcleo compartido por ambas) directo contra el `ctx` de `createApiRoute`, en vez de delegar a `verifyStoreAdminAuth` (que crearía su propio client de Supabase redundante). No confundir los tres nombres: `resolveStoreAdminStatus` (núcleo, compartido) → `verifyStoreAdminAuth` (wrapper para páginas) → `requireAdmin` (guard para rutas de API, este documento).

## Por qué existe esta regla

Antes de #43, "¿puede este usuario administrar esta Store?" se reimplementaba de forma independiente en varios lugares del código — cada uno con su propia query y su propio chequeo de rol. Encontrado arreglando un lockout de producción del Platform admin: se corrigió un lugar primero, y quedaron otros rotos hasta un segundo pase, porque nadie sabía que existían por separado (ver [ADR-0005](../adr/0005-store-scoped-admin-membership.md)). Esa historia se repitió después a nivel de código de aplicación con 46 call sites en 36 archivos de API repitiendo el mismo ritual de guard + 403 — `withStoreAdmin` fue la primera consolidación de esa segunda ronda (#101); `requireAdmin` es la migración de ese mismo guard al pipeline de `createApiRoute` (ADR-0013), no un concepto nuevo.

## Cómo usarlo

```ts
export const POST = createApiRoute(requireAdmin)(async (ctx, { id }) => {
  // ctx.storeId y ctx.userId ya resueltos y verificados — acá adentro sos admin, seguro.
  // params dinámicos propios de la ruta (id, orderId, productId, etc.) llegan
  // como segundo argumento, tipados via createApiRoute<{ id: string }>().
  // ...
});
```

`createApiRoute(...guards)` resuelve `storeId` una sola vez contra el slug de la URL y corre cada guard en orden contra ese contexto compartido, cortando en el primero que devuelve una respuesta (404 si la Store no existe, antes de correr ningún guard). `requireAdmin` devuelve `401` si no hay sesión (semánticamente correcto, RFC 7235) o `403` con `'Forbidden: Admin access required'` si hay sesión pero no es admin de esa Store — mismo texto default que tenía `withStoreAdmin`, sin cambio de contrato para los 4 componentes que lo leen (`OrdersTable`, `AdminProductList`, `StockManagement`, `CategoryManagement`, todos vía `.includes('Forbidden')`).

## Qué NO hacer

```ts
// ❌ No reimplementar esto — es exactamente el patrón que requireAdmin reemplaza.
const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
if (!isStoreAdmin || storeId == null) {
  return NextResponse.json({ error: authError || 'Forbidden: Admin access required' }, { status: 403 });
}
```

## Excepciones: rutas intencionalmente públicas

No todo endpoint bajo `[store]/api/` requiere admin. Ejemplos vivos hoy: `POST /api/orders` (creación de pedido por WhatsApp, sin login), `GET /api/categories` y `GET /api/categories/[id]/subcategories` (lectura pública del catálogo), `GET /api/recommendations` (recomendaciones públicas) — todos `createApiRoute()` sin guards. Dejarlas así, no envolverlas "por consistencia". Si un archivo mezcla métodos públicos y admin-gated (ej. `orders/route.ts`: `POST` público, `GET` admin), solo el método admin-gated pasa `requireAdmin` a `createApiRoute`.

## Excepción: método mixto público/admin dentro de un mismo handler

`createApiRoute(requireAdmin)` aplica el guard al handler ENTERO — no encaja cuando un mismo método es condicionalmente admin. Dos casos así, con `requireAdmin(ctx)` llamado inline en vez de en el pipeline:

```ts
// products/route.ts GET — público por default (catálogo), admin solo si includeInactive.
export const GET = createApiRoute()(async (ctx) => {
  const includeInactive = /* ...leer query param... */;
  if (includeInactive) {
    const guardResult = await requireAdmin(ctx);
    if (guardResult) return guardResult;
  }
  // ...
});
```

- `products/route.ts` `GET`: público por default, solo pide admin dentro del branch `if (includeInactive)`.
- `products/[id]/route.ts` `GET`: público por default, solo pide admin dentro del branch `if (!product.active)` — y ahí devuelve `404` (no `403`), a propósito: no confirmar ni que el producto existe a quien no es admin.

Sus otros métodos (`POST` en el primero, `PUT`/`DELETE` en el segundo) sí usan `createApiRoute(requireAdmin)` normal. No "arreglar" estos dos `GET` moviéndolos al pipeline — perderían su mitad pública. Si algún día se separan en dos rutas (una pública, una admin-only), ahí sí migra la parte admin al pipeline estándar.

## Qué sigue siendo responsabilidad del caller

`requireAdmin` no cachea el resultado entre requests — cada pedido HTTP vuelve a verificar contra la base (`profiles` + `store_admins`, vía `resolveStoreAdminStatus`). Es una decisión deliberada, no un olvido: cachear el permiso entre requests (vía JWT claims o similar) es un cambio de arquitectura de autenticación más grande, con su propia complicación (revocar acceso no sería instantáneo) — se evaluará si el tráfico lo justifica, no antes.
