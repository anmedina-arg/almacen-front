# Rutas de API admin-gated: usar el guard compartido, no reimplementarlo

Toda ruta bajo `src/app/[store]/api/**/route.ts` que requiera ser Store admin o Platform admin para ejecutarse tiene que usar un guard compartido — nunca llamar a `verifyStoreAdminAuth(store)` directo desde un `route.ts` y armar el `403`/`401` a mano.

**Dos patrones coexisten hoy, a propósito, mientras dura la migración de #114 (ADR-0013):**

- **`withStoreAdmin`** (`src/features/auth/utils/apiAuth.ts`) — el patrón establecido, todavía usado por la mayoría de las rutas sin migrar. Ver "Cómo usarlo" abajo.
- **`createApiRoute(requireAdmin)`** (`src/lib/api/createApiRoute.ts` + `src/lib/auth/requireAdmin.ts`) — el patrón nuevo, usado por las rutas ya migradas a la capa de servicios (`categories`/`subcategories`, #115, y las que sigan según el orden de #112). Ver ADR-0013 para el pipeline de guards completo.

No mezclar los dos en una ruta que no fue migrada — una ruta sin migrar sigue con `withStoreAdmin` hasta que le toque su turno en la migración, no se cambia de a una ad hoc. Una diferencia real entre ambos, no un descuido: `requireAdmin` devuelve `401` cuando no hay sesión (semánticamente correcto, RFC 7235); `withStoreAdmin` devuelve `403` para el mismo caso — no se homologó al migrar, alinear las ~39 rutas restantes es trabajo de la migración misma, no de este documento.

## Por qué existe esta regla

Antes de #43, "¿puede este usuario administrar esta Store?" se reimplementaba de forma independiente en varios lugares del código — cada uno con su propia query y su propio chequeo de rol. Encontrado arreglando un lockout de producción del Platform admin: se corrigió un lugar primero, y quedaron otros rotos hasta un segundo pase, porque nadie sabía que existían por separado (ver [ADR-0005](../adr/0005-store-scoped-admin-membership.md)). Esa historia se repitió después a nivel de código de aplicación con 46 call sites en 36 archivos de API repitiendo el mismo ritual de guard + 403 — `withStoreAdmin` es la consolidación de esa segunda ronda (#101).

## Cómo usarlo

```ts
export const POST = withStoreAdmin(async (req, { storeId, userId }, ctx) => {
  // storeId y userId ya resueltos y verificados — acá adentro sos admin, seguro.
  const { id } = await ctx.params; // params dinámicos propios de la ruta, sin tocar
  // ...
});
```

`withStoreAdmin` solo resuelve `store` (siempre presente en `[store]/...`) → `{ storeId, userId }`. Cualquier otro param dinámico (`orderId`, `id`, `productId`, etc.) lo sigue extrayendo el handler, sin intervención del wrapper.

El mensaje default del 403 es siempre `'Forbidden: Admin access required'` (cuando `verifyStoreAdminAuth` no trae un `error` propio). Al migrar #101, 8 archivos usaban antes solo `'Forbidden'` (sin el sufijo) — se normalizó a un único texto en vez de preservar variantes por archivo. Confirmado sin impacto: ningún componente de dashboard/informes lee ese texto, y los 4 que sí lo hacen (`OrdersTable`, `AdminProductList`, `StockManagement`, `CategoryManagement`) chequean `.includes('Forbidden')`, que matchea las dos versiones.

## Qué NO hacer

```ts
// ❌ No reimplementar esto — es exactamente el patrón que withStoreAdmin reemplaza.
const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
if (!isStoreAdmin || storeId == null) {
  return NextResponse.json({ error: authError || 'Forbidden: Admin access required' }, { status: 403 });
}
```

## Excepciones: rutas intencionalmente públicas

No todo endpoint bajo `[store]/api/` requiere admin. Ejemplos vivos hoy: `POST /api/orders` (creación de pedido por WhatsApp, sin login), `GET /api/categories` y `GET /api/categories/[id]/subcategories` (lectura pública del catálogo), `GET /api/recommendations` (recomendaciones públicas). Estas rutas no usan `withStoreAdmin` — dejarlas así, no envolverlas "por consistencia". Si un archivo mezcla métodos públicos y admin-gated (ej. `orders/route.ts`: `POST` público, `GET` admin), solo el método admin-gated se envuelve.

## Excepción: método mixto público/admin dentro de un mismo handler

`withStoreAdmin` asume que el handler ENTERO requiere admin — no encaja cuando un mismo método es condicionalmente admin. Dos casos así, sin migrar a propósito, con el chequeo viejo (`verifyStoreAdminAuth` inline) intacto:

- `products/route.ts` `GET`: público por default (catálogo), solo pide admin dentro del branch `if (includeInactive)`.
- `products/[id]/route.ts` `GET`: público por default, solo pide admin dentro del branch `if (!product.active)` (visibilidad de producto inactivo).

Sus otros métodos (`POST` en el primero, `PUT`/`DELETE` en el segundo) sí están migrados. No "arreglar" estos dos `GET` moviéndolos a `withStoreAdmin` — perderían su mitad pública. Si algún día se separan en dos rutas (una pública, una admin-only), ahí sí migra la parte admin.

## Qué sigue siendo responsabilidad del caller

`withStoreAdmin` no cachea el resultado entre requests — cada pedido HTTP vuelve a verificar contra la base (`profiles` + `store_admins`). Es una decisión deliberada, no un olvido: cachear el permiso entre requests (vía JWT claims o similar) es un cambio de arquitectura de autenticación más grande, con su propia complicación (revocar acceso no sería instantáneo) — se evaluará si el tráfico lo justifica, no antes.
