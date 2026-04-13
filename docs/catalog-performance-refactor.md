# Refactor de Performance: Catálogo (Scroll Único + SSR Completo)

## Fecha de inicio: 2026-04-10
## Estado: IMPLEMENTADO — pendiente verificación en dispositivo

---

## Contexto y motivación

El catálogo actual usa infinite scroll lazy: carga una categoría a la vez, a medida que el usuario scrollea.
Cuando el usuario toca un chip de categoría que todavía no fue cargada, el sistema hace N fetches
secuenciales hasta llegar a esa sección, produciendo una latencia visible de 300-800ms.

El 90% de los usuarios acceden desde mobile. La app se distribuye como PWA.

**Objetivo**: eliminar toda latencia de navegación entre categorías/subcategorías, manteniendo
el scroll continuo como experiencia de browsing y los chips como atajos de smooth scroll.

---

## Decisión arquitectónica

**Cargar todos los productos en SSR (sin filtro de categoría).**

- 550 productos × ~70 bytes/producto ≈ ~35-40 KB gzip (JSON puro, sin imágenes)
- Las imágenes siguen siendo lazy: Next.js Image solo las descarga cuando entran al viewport
- Todas las secciones existen en el DOM desde el primer render
- Smooth scroll a cualquier categoría/subcategoría = instantáneo, siempre
- El scroll spy se simplifica: no necesita MutationObserver

---

## Root cause documentado

### Problema 1 — Fetches secuenciales al tocar un chip

`CategoryChip.tsx` despacha un evento custom cuando la sección no existe en el DOM:

```ts
// CategoryChip.tsx:17-24
if (!document.getElementById(sectionId)) {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('catalog:request-category', { detail: sectionId }));
}
```

`ProductSearchController.tsx` escucha ese evento y llama `fetchNextPage()` en loop:

```ts
// ProductSearchController.tsx:61-77
useEffect(() => {
  if (!pendingScrollTarget) return;
  const section = document.getElementById(pendingScrollTarget);
  if (section) { section.scrollIntoView(...); return; }
  if (hasNextPage && !isFetchingNextPage) fetchNextPage(); // ← loop
}, [pendingScrollTarget, data, ...]);
```

Si el usuario toca el chip de la categoría 8, el sistema hace 7 fetches antes de llegar.

### Problema 2 — MutationObserver sobre todo el body

```ts
// useScrollSpy.ts:67-70
mo.observe(document.body, { childList: true, subtree: true });
```

Corre continuamente para detectar secciones nuevas agregadas por el infinite scroll.
Con secciones estáticas (todo en SSR), este overhead desaparece.

---

## Comparación de performance

| Métrica                                   | Actual              | Propuesto          |
|-------------------------------------------|---------------------|--------------------|
| Tap chip categoría cargada               | ~0ms                | ~0ms               |
| Tap chip categoría NO cargada            | 300-800ms × N saltos| **0ms**            |
| Tap badge subcategoría NO cargada        | ídem                | **0ms**            |
| MutationObserver activo                  | Sí (body completo)  | **Eliminado**      |
| Fetches de API al navegar                | 1 por categoría     | **0**              |
| Payload JSON inicial                     | ~5 KB (1 categoría) | ~40 KB (550 prods) |
| Overhead SSR                             | Bajo                | Levemente mayor    |
| Scroll spy estabilidad                   | Depende del loop    | **Estático, preciso** |

---

## Archivos involucrados

### Archivos que CAMBIAN

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/features/catalog/components/ProductCatalogLoader.tsx` | Simplificación: fetch sin categoryId |
| `src/features/catalog/components/ProductSearchController.tsx` | Simplificación mayor: eliminar infinite query, pendingScrollTarget, sentinel |
| `src/features/catalog/hooks/useScrollSpy.ts` | Simplificación: eliminar MutationObserver |
| `src/features/catalog/components/CategoryChip.tsx` | Simplificación: eliminar handleClick con event dispatch |
| `src/app/api/products/route.ts` | Mejora: agregar cache headers para requests del catálogo público |

### Archivos que SE ELIMINAN

| Archivo | Motivo |
|---------|--------|
| `src/features/catalog/hooks/useCatalogByCategory.ts` | Reemplazado por SSR completo |

### Archivos que NO CAMBIAN

| Archivo | Motivo |
|---------|--------|
| `src/features/catalog/components/FilterButtons.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/CategoryNav.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/ProductList.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/CatalogCard.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/SubcategoryBadge.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/ProductCatalog.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/ProductCatalogSkeleton.tsx` | Sin cambios necesarios |
| `src/features/catalog/hooks/useCategoryScrollSync.ts` | Sin cambios necesarios |
| `src/features/catalog/hooks/useProductSearch.ts` | Sin cambios necesarios |
| `src/features/catalog/hooks/useProductSearchQuery.ts` | Sin cambios necesarios |
| `src/features/catalog/services/fetchPublicProducts.ts` | Sin cambios necesarios |
| `src/features/catalog/services/fetchCategoriesWithSubs.ts` | Sin cambios necesarios |
| `src/components/ProductCard.tsx` | Sin cambios necesarios |
| `src/features/catalog/components/ProductSquareCard.tsx` | Sin cambios necesarios |

---

## Plan de implementación paso a paso

### Paso 1 — `ProductCatalogLoader.tsx`

**Qué hace hoy:**
```ts
const firstCategoryId = categories[0]?.id;
const initialProducts = firstCategoryId
  ? await fetchPublicProducts({ categoryId: firstCategoryId })
  : [];
```

**Qué debe hacer:**
```ts
const initialProducts = await fetchPublicProducts(); // sin filtro → todos los productos
```

**Impacto:** El SSR ahora trae todos los productos de una sola vez.
El tiempo de SSR aumenta levemente (~100-200ms más en el servidor),
pero elimina todos los fetches posteriores de categorías.

**Nota:** `fetchPublicProducts()` sin argumentos ya soporta esto (no tiene filtro obligatorio).

---

### Paso 2 — `ProductSearchController.tsx`

**Qué eliminar:**
- Import de `useCatalogByCategory`
- Import de `useRef` (si queda sin uso)
- Estado `pendingScrollTarget` y su `useState`
- `useEffect` que escucha `catalog:request-category`
- `useEffect` que llama `fetchNextPage()` en loop
- `useEffect` del sentinel IntersectionObserver
- `sentinelRef`
- Variables `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`
- El `<div ref={sentinelRef}>` y el mensaje "Cargando más productos..."

**Qué queda:**
- `useProductSearch` + `useProductSearchQuery` (search mode intacto)
- `products` = `initialProducts` en browse mode (ya en memoria, sin query)
- `displayCategories` calculado igual que hoy (el useMemo no cambia)
- `<ProductSearchBar>` + `<ProductSearchSection>` sin cambios

**Estado simplificado post-refactor:**
```ts
// Browse mode: productos ya en memoria desde SSR
const products = isSearchMode
  ? (searchResults ?? [])
  : initialProducts;
```

---

### Paso 3 — `useScrollSpy.ts`

**Qué eliminar:**
- El `MutationObserver` completo (líneas 67-70 actuales)
- La variable `mo` y su `disconnect()` en el cleanup

**Qué queda:**
```ts
useEffect(() => {
  const io = new IntersectionObserver(callback, { rootMargin: SPY_ROOT_MARGIN });
  ioRef.current = io;

  // Observar todas las secciones (ya existen en el DOM al montar)
  document.querySelectorAll(SPY_SELECTOR).forEach(observeSection);

  return () => {
    io.disconnect();
    observedRef.current.clear();
  };
}, [observeSection]);
```

**Impacto:** El spy se inicializa una sola vez. Sin overhead continuo.

---

### Paso 4 — `CategoryChip.tsx`

**Qué eliminar:**
- La función `handleClick` completa (líneas 17-25 actuales)
- El prop `onClick={handleClick}` del `<Link>`

**Qué queda:**
```ts
export const CategoryChip = forwardRef<HTMLAnchorElement, CategoryChipProps>(
  function CategoryChip({ to, label, imageUrl, active = false, priority = false }, ref) {
    return (
      <Link
        ref={ref}
        href={to}
        // Sin onClick — el anchor href funciona directamente
        className={...}
      >
        ...
      </Link>
    );
  }
);
```

**Impacto:** El chip es un anchor puro. La sección siempre existe, no hay fallback necesario.

**Nota importante sobre smooth scroll:**
El `href="#Categoria"` del `<Link>` de Next.js hace scroll nativo del browser.
Para smooth scroll en mobile hay que verificar que el CSS global tenga:
```css
html {
  scroll-behavior: smooth;
}
```
Si no está, agregarlo en `globals.css`. Verificar en el Paso 4.

---

### Paso 5 — Eliminar `useCatalogByCategory.ts`

Borrar el archivo:
```
src/features/catalog/hooks/useCatalogByCategory.ts
```

Verificar que ningún otro archivo lo importe antes de eliminarlo.

---

### Paso 6 — `/api/products/route.ts`

**Agregar cache headers para requests del catálogo público:**

```ts
// Cuando es request público (no admin, no search), cachear en CDN
const isPublicCatalog = !includeInactive && !search && categoryId == null;

return NextResponse.json(products, {
  headers: isPublicCatalog
    ? {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      }
    : {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
});
```

**Impacto:** El endpoint de search sigue sin caché (correcto).
Si en algún momento se vuelve a usar el endpoint para el catálogo completo,
Vercel CDN lo sirve sin llegar a Supabase durante 5 minutos.

---

## Comportamiento esperado post-refactor

### Navegación por scroll (browse)
```
Usuario scrollea hacia abajo
  → Todas las secciones ya están en el DOM
  → IntersectionObserver detecta la sección visible
  → useScrollSpy actualiza activeCatName + activeSubName
  → Chip de categoría se activa visualmente (fondo oscuro)
  → Badge de subcategoría se activa visualmente
  → Ambos se auto-scrollean al centro de su fila horizontal
  → Sin fetches, sin MutationObserver, sin overhead
```

### Navegación por tap en chip/badge (atajos)
```
Usuario toca chip "Congelados"
  → href="#Congelados" ejecuta scroll nativo (smooth)
  → La sección SIEMPRE existe (cargada en SSR)
  → Scroll llega al destino en ~300ms (animación del browser)
  → IntersectionObserver actualiza el estado activo
  → Sin fetches, sin eventos custom, sin loops
```

### Búsqueda
```
Usuario escribe en el search bar
  → 300ms debounce
  → useProductSearchQuery hace fetch a /api/products?search=...
  → Resultados reemplazan la vista
  → Experiencia sin cambios respecto al estado actual
```

---

## Verificaciones post-implementación

Antes de considerar el refactor completo, verificar:

- [ ] Smooth scroll funciona en Chrome/Safari mobile (verificar `scroll-behavior: smooth` en CSS)
- [ ] El chip activo se actualiza correctamente al scrollear hacia abajo
- [ ] El chip activo se actualiza correctamente al scrollear hacia arriba
- [ ] El badge de subcategoría activo se actualiza correctamente
- [ ] Tap en chip → scroll llega a la sección correcta
- [ ] Tap en badge → scroll llega a la subsección correcta
- [ ] Búsqueda funciona igual que antes
- [ ] Volver de búsqueda a browse mode muestra todos los productos
- [ ] Tiempo de carga inicial (LCP) no regresó respecto al estado anterior
- [ ] No hay errores de TypeScript ni warnings en consola
- [ ] Build de producción pasa sin errores (`npm run build`)

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| SSR más lento por cargar 550 productos | Aceptable: ~100-200ms extra en servidor, 0ms en cliente |
| `scroll-behavior: smooth` no soportado en algún browser viejo | Fallback: scroll sin animación (funcional igual) |
| Productos sin `category_id` asignado no aparecen en ninguna sección | Ya existe esta lógica en `ProductList.tsx` (`category_name ?? mainCategory`) |
| El `displayCategories` en search mode se calculaba a partir de `data?.pages.flat()` | Cambia a calcularse desde `initialProducts` en browse mode (mismo resultado) |

---

## Notas de sesión

- **2026-04-10**: Plan documentado. Pendiente implementación.
- **2026-04-11**: Implementación completa. TypeScript sin errores (tsc --noEmit: EXIT 0).
  Build bloqueado por dev server activo (EPERM en .next/trace) — verificar con `npm run build` con dev server detenido.
