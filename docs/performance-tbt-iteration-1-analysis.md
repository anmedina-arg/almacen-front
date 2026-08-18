# Performance — TBT Iteration 1: Análisis

## Contexto

| Métrica | Valor actual | Objetivo |
|---|---|---|
| TBT | 980ms | < 200ms |
| Score | 71 | ≥ 85 |
| LCP | 2.7s | ✅ resuelto |

---

## 1. Chunk 5964 (1,020ms Script Evaluation)

No hay source maps disponibles localmente para identificarlo con precisión, pero el análisis del grafo de imports lo revela.

El chunk pesado es el **bundle del catálogo público** (Client Components de la página `/`). El árbol de componentes que hidrata en el cliente incluye:

- `Providers` → `QueryClientProvider` + `AuthProvider`
- `ProductSearchController` → `useCatalogByCategory` + `useProductSearch`
- `ProductList` → `CatalogCard` → `ProductCard` + `ProductSquareCard` (un componente por cada producto de la primera categoría)
- `OrderFlowController` → `ConfirmationModal` → `SuggestionsSection` → `useRecommendations`
- `InfoBanner`, `AdminPanelLink`, `HelpButton`

Como casi toda la página es Client Component, todo termina agrupado en un único chunk pesado. El problema es de arquitectura de componentes, no de dependencias externas (el stack no usa recharts, lodash, date-fns ni otras librerías pesadas).

---

## 2. Client Components en la página `/` — Análisis de necesidad

| Componente | ¿Necesita client? | Razón | Oportunidad |
|---|---|---|---|
| `Providers` | ✅ Sí | QueryClientProvider, AuthProvider requieren client | No cambiar |
| `HeaderClient` | ✅ Sí | scroll state + useIsAuthenticated | Ya optimizado (Iter 4) |
| `AdminPanelLink` | ⚠️ Parcialmente | Solo usa `useUser` (Zustand) + query de rol | Candidato a `dynamic({ ssr: false })` — 99% de usuarios ve `null` |
| `InfoBanner` | ⚠️ Parcialmente | Lee `localStorage` en `useEffect` — siempre renderiza `null` en SSR | **Candidato a `dynamic({ ssr: false })`** — hidratar algo invisible es puro costo |
| `ProductSearchController` | ✅ Sí | IntersectionObserver + TanStack Query | Necesario |
| `ProductList` | ⚠️ Parcialmente | `useState` para toggle list/grid + `useEffect` scroll | Impacto menor; el toggle podría ser URL param pero no vale la complejidad |
| `CatalogCard` | ✅ Sí | Zustand cart state por producto | Necesario |
| `OrderFlowController` | ⚠️ Diferible | WhatsApp button + modal — no visible hasta que el usuario agrega algo al carrito | **Candidato a `dynamic({ ssr: false })`** — árbol pesado que hidrata innecesariamente |
| `ConfirmationModal` | ⚠️ Diferible | Solo visible cuando el usuario confirma el pedido | Nunca visible en first render; se incluye en hydration inicial como parte de `OrderFlowController` |
| `SuggestionsSection` | ⚠️ Diferible | Solo visible dentro del modal de confirmación | Llama a la API al hidratar aunque el modal esté cerrado |
| `HelpButton` | ⚠️ Trivial | Solo `localStorage.removeItem` + `window.location.reload` | El único código client es el `onClick`; podría eliminarse el `'use client'` con un wrapper mínimo |
| `ProductSearchBar` | ⚠️ Parcialmente | `onChange` handler | Muy liviano, impacto menor |
| `FilterButtons` | ✅ Sí | IntersectionObserver scroll sync | Necesario |

---

## 3. Imports pesados en el bundle inicial

No hay librerías de terceros realmente pesadas. Los problemas son estructurales, no de dependencias:

- `dompurify` — verificar que no esté en el path crítico del catálogo público
- `@tanstack/react-query-devtools` — incluido en `Providers` con guard `NODE_ENV === 'development'`; tree-shaken en prod ✅
- `@supabase/auth-helpers-nextjs` + `@supabase/ssr` — importados en client components del path principal

---

## 4. Estado de GTM / GA4

`GoogleAnalytics.tsx` usa `'use client'` + `next/script` con `strategy="afterInteractive"`.

**Problemas identificados:**

1. **`'use client'` innecesario** — `next/script` con `strategy="afterInteractive"` funciona igual en un Server Component. El único código "client" son 6 `console.log` de debug que no cumplen ninguna función en producción.
2. **Logs de debug en producción** — 6 `console.log` + 1 `console.warn` ejecutan en el cliente en cada carga.
3. **El componente hidrata con el bundle inicial** — al ser `'use client'`, forma parte del árbol de hydration aunque los scripts se carguen después de `afterInteractive`.
4. **Costo en Lighthouse: 356ms** — segundo mayor después del chunk propio.

**Fix disponible:** eliminar `'use client'`, eliminar `useEffect` con los `console.log`, dejar solo los dos `<Script>` tags. `next/script` en Server Component no requiere hydration.

---

## 5. Hipótesis priorizadas por impacto estimado en TBT

### #1 — `OrderFlowController` con `dynamic({ ssr: false })` — Impacto alto (~200-300ms)

`ConfirmationModal` incluye `SuggestionsSection` → `useRecommendations`, que llama a la API. Todo ese árbol hidrata al cargar aunque el modal nunca sea visible hasta que el usuario interactúa.

```tsx
// En ProductCatalog.tsx
const OrderFlowController = dynamic(
  () => import('./OrderFlowController').then((m) => ({ default: m.OrderFlowController })),
  { ssr: false }
);
```

### #2 — `InfoBanner` con `dynamic({ ssr: false })` — Impacto medio (~100-150ms)

`InfoBanner` siempre renderiza `null` en SSR porque lee `localStorage` en `useEffect`. Hidratar un componente que es invisible en el first render es puro costo de hydration.

```tsx
// En ProductCatalog.tsx
const InfoBanner = dynamic(
  () => import('./InfoBanner').then((m) => ({ default: m.InfoBanner })),
  { ssr: false }
);
```

### #3 — `GoogleAnalytics` como Server Component — Impacto medio (~80-150ms)

Eliminar `'use client'` y los `console.log` de debug. `next/script` funciona en Server Components y no necesita hydration client-side.

```tsx
// Sin 'use client', sin useEffect
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script src={`...`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`...`}</Script>
    </>
  );
}
```

### #4 — `AdminPanelLink` con `dynamic({ ssr: false })` — Impacto bajo-medio (~50-80ms)

El 99% de usuarios son visitantes no-admin. El componente hidrata, hace una query a Supabase para obtener el rol, y renderiza `null`. Hydration + query innecesaria para casi todos los usuarios.

```tsx
// En page.tsx o donde se use
const AdminPanelLink = dynamic(
  () => import('@/components/AdminPanelLink').then((m) => ({ default: m.AdminPanelLink })),
  { ssr: false }
);
```

### #5 — `HelpButton` simplificado — Impacto bajo

El único código client es el `onClick`. Se podría extraer a un Client Component wrapper de una sola línea y hacer el resto Server Component, aunque el impacto en TBT es mínimo dado lo liviano del componente.

---

## Resumen ejecutivo

El TBT de 980ms viene de hidratar un árbol de Client Components muy grande en el critical path, donde **varios componentes son invisibles o innecesarios en el first render** (`InfoBanner`, `ConfirmationModal`, `SuggestionsSection`).

La solución principal no es reducir dependencias (el stack ya es lean) sino **diferir con `dynamic({ ssr: false })` los componentes que no se necesitan al cargar la página**.

| Acción | Impacto estimado | Complejidad |
|---|---|---|
| `OrderFlowController` lazy | ~200-300ms | Baja |
| `InfoBanner` lazy | ~100-150ms | Baja |
| `GoogleAnalytics` → Server Component | ~80-150ms | Baja |
| `AdminPanelLink` lazy | ~50-80ms | Baja |

**Reducción total estimada: ~430-680ms de TBT**, lo que llevaría el valor de 980ms a un rango de ~300-550ms. Para alcanzar < 200ms puede requerirse una segunda iteración con análisis del bundle post-fix.

---

## Notas

- Stack: Next.js 15 + TypeScript + Supabase + Cloudinary
- Screaming Architecture — respetar estructura de carpetas
- No tocar optimizaciones de LCP ya implementadas (Iter 1-4)
- El TBT se mide con Lighthouse en modo "DevTools throttling (advanced)" + Network "No throttling"
- Variación natural de Lighthouse: ±50-100ms en TBT entre ejecuciones
