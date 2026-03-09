# Refactorización del Proyecto Market Cevil

**Stack**: Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query v5 · Supabase
**Arquitectura base**: Screaming Architecture (feature-folder pattern)
**Fecha**: Marzo 2026

---

## Tabla de Contenidos

1. [Bloque 1 — Centralización de utilidades compartidas](#bloque-1--centralización-de-utilidades-compartidas)
   - 1a. `normalize()` — 3 implementaciones inline → utilidad compartida
   - 1b. `formatPrice()` — 20 instancias de `.toFixed(2)` → formateador con `Intl`
   - 1c. `formatQuantity()` → capa compartida
   - 1d. `getQuantityPerClick`, `getWeightType`, `isProductByWeight` → capa compartida
2. [Bloque 2 — Unificación del fetch de productos](#bloque-2--unificación-del-fetch-de-productos-arquitectura-tanstack-query)
3. [Bloque 3 — ProductCard como componente compartido](#bloque-3--productcard-como-componente-compartido-screaming-architecture)
4. [Bloque 4 — Extracción de ComboDisclosure y eliminación de `'use client'` en ProductCard](#bloque-4--extracción-de-combodisclosure-y-eliminación-de-use-client-en-productcard)
5. [Bloque 5 — Fix de `usePOSCart` para productos por peso](#bloque-5--fix-de-usposcart-para-productos-por-peso)
6. [Bloque 6 — Refactorización de FilterButtons (CategoryNav)](#bloque-6--refactorización-de-filterbuttons-categorynav)
7. [Bloque 7 — Optimización de re-renders en ProductList](#bloque-7--optimización-de-re-renders-en-productlist)
8. [Tabla de Resumen](#tabla-de-resumen)

---

## Bloque 1 — Centralización de utilidades compartidas

### Concepto teórico: DRY y la capa de utilidades compartidas

El principio **DRY** (*Don't Repeat Yourself*) establece que cada pieza de conocimiento debe tener una representación única, inequívoca y autoritativa dentro del sistema. Cuando la misma lógica aparece en múltiples lugares, se generan problemas concretos:

- Un bug corregido en una copia no se propaga a las demás.
- Los tests deben duplicarse para cubrir todas las variantes.
- Las actualizaciones de comportamiento requieren buscar y modificar múltiples archivos.

En Screaming Architecture el árbol de carpetas comunica las intenciones del dominio (`features/catalog`, `features/admin`, etc.). Sin embargo, existe una capa horizontal legítima: `src/utils/`. Allí viven las funciones **puras** (sin efectos, sin dependencias de React) que son necesarias en más de un dominio.

---

### 1a. `normalize()` — 3 implementaciones inline → `src/utils/normalize.ts`

#### Problema

La normalización de texto para búsqueda (quitar tildes, minúsculas, eliminar caracteres especiales) es una operación de dominio puro. Sin embargo, aparecía escrita de forma inline e independiente en tres componentes distintos:

```typescript
// ANTES — ProductListContainer.tsx (catálogo público)
const q = s.toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, '')
  .trim();

// ANTES — StockEntryPanel.tsx (admin/stock) — misma lógica, pero sin .trim()
const q = s.toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, '');

// ANTES — POSView.tsx (admin/POS) — misma lógica, con pequeña variante de regex
const q = s.toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\w\s]/g, '')
  .trim();
```

Tres copias, tres ligeras divergencias. La variante de POSView usa `\w` en vez de `a-z0-9`, lo que en ciertos locales puede producir resultados distintos. Esto es un bug silencioso.

#### Solución

```typescript
// DESPUÉS — src/utils/normalize.ts
/**
 * Normaliza un texto para comparación: minúsculas, sin tildes,
 * solo alfanumérico y espacios, sin espacios extremos.
 *
 * Acepta undefined/null para facilitar uso directo con datos de API.
 */
export const normalize = (s?: string): string =>
  (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos (tildes, ñ→n, etc.)
    .replace(/[^a-z0-9\s]/g, '')    // solo alfanumérico y espacios
    .trim();
```

```typescript
// DESPUÉS — uso en cualquier feature
import { normalize } from '@/utils/normalize';

const matches = products.filter(p =>
  normalize(p.name).includes(normalize(searchQuery))
);
```

#### Por qué mejora el código

1. **Comportamiento único y verificable**: un solo test cubre los tres casos de uso.
2. **Contrato explícito**: el parámetro `s?: string` documenta que la función maneja valores ausentes.
3. **Referencia autoritativa**: cualquier cambio futuro (por ejemplo, normalizar la `ñ` como `n`) se aplica en un solo lugar.

---

### 1b. `formatPrice()` — 20 instancias de `.toFixed(2)` → `src/utils/formatPrice.ts`

#### Concepto teórico: `Intl.NumberFormat` y el patrón de instancia a nivel de módulo

`.toFixed(2)` es un método de `Number` que devuelve un string con exactamente 2 decimales. Funciona, pero tiene limitaciones serias:

- No respeta la configuración regional: en Argentina se esperan pesos (`$1.250,50`), no dólares (`$1250.50`).
- No incluye el símbolo de moneda automáticamente.
- Crea inconsistencias: algunos archivos usaban `"$" + price.toFixed(2)`, otros `price.toFixed(2) + " ARS"`.

La API `Intl.NumberFormat` del navegador (y Node.js) formatea números según la configuración regional y soporta tipos de moneda:

```typescript
new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(1250.5)
// → "$1.250,50"
```

**Patrón de instancia a nivel de módulo**: crear el objeto `Intl.NumberFormat` una vez al cargar el módulo, no en cada llamada. La construcción de formatters `Intl` tiene un costo no trivial; reutilizar la misma instancia reduce la presión sobre el garbage collector.

```typescript
// ANTES — disperso en 10+ archivos
`$${product.price.toFixed(2)}`
`$${(price * qty).toFixed(2)}`
// En algunos archivos:
price.toFixed(2)       // sin símbolo
"$ " + price.toFixed(2) // con espacio extra
```

```typescript
// DESPUÉS — src/utils/formatPrice.ts

// La instancia se crea UNA vez cuando se importa el módulo.
// Todos los llamadores comparten la misma instancia → 0 allocations extra.
const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export const formatPrice = (price: number): string =>
  priceFormatter.format(price);
```

```typescript
// DESPUÉS — uso en componentes
import { formatPrice } from '@/utils/formatPrice';

<span>{formatPrice(product.price)}</span>
<span>{formatPrice(subtotal)}</span>
```

#### Por qué mejora el código

1. **Corrección regional**: el formato `$1.250,50` es el esperado en Argentina, no `$1250.50`.
2. **Consistencia visual garantizada**: imposible que una pantalla muestre `$1250.5` y otra `$ 1.250,50`.
3. **Performance**: una instancia de formatter vs. 20 instancias efímeras por render.
4. **Mantenibilidad**: cambiar a otra moneda o locale requiere modificar un único archivo.

---

### 1c. `formatQuantity()` → capa `src/utils/`

#### Concepto teórico: utilidades de presentación compartidas

`formatQuantity` convierte una cantidad numérica al string correcto según el tipo de venta:

- `'unit'` → `"2"` (unidades enteras)
- `'kg'` → `"500 g"` o `"1.5 kg"` (según el valor)
- `'100gr'` → `"200 g"` (siempre en gramos)

Esta lógica existía solo en `src/features/catalog/utils/productUtils.ts`. Cuando el POS (feature `admin`) necesitó mostrar las mismas cantidades, se enfrentaba a dos opciones: importar desde `catalog` (violación de Screaming Architecture) o duplicar.

```typescript
// ANTES — solo accesible desde features/catalog
// src/features/catalog/utils/productUtils.ts
export function formatQuantity(qty: number, saleType: SaleType): string {
  if (saleType === 'unit') return qty.toString();
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)} kg`;
  return `${qty} g`;
}
```

```typescript
// DESPUÉS — src/utils/formatQuantity.ts (capa compartida)
export function formatQuantity(qty: number, saleType: SaleType): string {
  if (saleType === 'unit') return qty.toString();
  if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)} kg`;
  return `${qty} g`;
}

// DESPUÉS — src/features/catalog/utils/productUtils.ts
// Re-exporta para compatibilidad retroactiva — 0 breaking changes
export { formatQuantity } from '@/utils/formatQuantity';
```

El re-export de compatibilidad es una técnica de migración gradual: los archivos existentes que ya importaban desde `catalog/utils` siguen funcionando sin modificación, mientras los nuevos importan directamente desde `@/utils`.

---

### 1d. `getQuantityPerClick`, `getWeightType`, `isProductByWeight` → `src/utils/productUtils.ts`

#### Concepto teórico: lógica de dominio puro vs. lógica de presentación

Estas tres funciones encapsulan reglas de negocio relacionadas con los tipos de venta de productos:

- `isProductByWeight(product)` → `boolean` — ¿se vende por peso?
- `getWeightType(product)` → `'kg' | '100gr' | null` — ¿qué unidad de peso?
- `getQuantityPerClick(product)` → `number` — ¿cuánto suma/resta cada clic? (500 para kg, 100 para 100gr, 1 para unidad)

Son funciones **puras** (sin efectos secundarios, sin referencias a React) que operan sobre el tipo `Product`. Son necesarias en el catálogo, el POS y el carrito.

```typescript
// ANTES — solo en src/features/catalog/utils/productUtils.ts
// No accesibles desde features/admin sin violar la arquitectura

// DESPUÉS — src/utils/productUtils.ts
import type { Product } from '@/types/product';

export function isProductByWeight(product: Product): boolean {
  return product.sale_type === 'kg' || product.sale_type === '100gr';
}

export function getWeightType(product: Product): 'kg' | '100gr' | null {
  if (product.sale_type === 'kg') return 'kg';
  if (product.sale_type === '100gr') return '100gr';
  return null;
}

/**
 * Devuelve el incremento/decremento por clic de "+" o "−".
 * kg → 500 g por clic
 * 100gr → 100 g por clic
 * unit → 1 unidad por clic
 */
export function getQuantityPerClick(product: Product): number {
  if (product.sale_type === 'kg') return 500;
  if (product.sale_type === '100gr') return 100;
  return 1;
}
```

```typescript
// DESPUÉS — re-export desde catalog para no romper imports existentes
// src/features/catalog/utils/productUtils.ts
export { isProductByWeight, getWeightType, getQuantityPerClick } from '@/utils/productUtils';
export { formatQuantity } from '@/utils/formatQuantity';
```

---

## Bloque 2 — Unificación del fetch de productos (arquitectura TanStack Query)

### Concepto teórico: TanStack Query v5 — identidad de caché, staleTime y deduplicación

TanStack Query identifica cada consulta por su **query key** — un array serializable. Dos llamadas a `useQuery` con la misma key comparten automáticamente:

- La misma entrada de caché (los datos en memoria).
- El mismo estado de loading/error.
- La misma deduplicación de requests (si dos componentes montan al mismo tiempo con la misma key, solo se ejecuta un fetch).

**`staleTime`** controla cuánto tiempo se considera "fresca" una respuesta. Con `staleTime: Infinity`, TanStack Query nunca marca los datos como stale: los fetches iniciales se realizan una sola vez por sesión de navegador y todos los componentes posteriores leen desde la caché sin ninguna petición de red. Este patrón es correcto cuando el catálogo de productos no cambia durante una sesión de usuario normal.

**El problema de las query keys aisladas**: si dos `useQuery` tienen keys distintas (`['catalog-products']` vs `['admin-products']`), TanStack Query los trata como consultas independientes. Cuando el admin actualiza un producto y se invalida `['admin-products']`, el catálogo continúa mostrando datos obsoletos porque su caché `['catalog-products']` no fue tocada.

---

### Antes — 3 cachés aisladas

```typescript
// ANTES 1 — src/features/catalog/hooks/useProducts.ts
// Sin TanStack Query: useState + useEffect manual
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nuevo fetch en CADA montaje del componente — sin caché alguna
    fetch('/api/products?_t=' + Date.now()) // cache-busting manual con timestamp
      .then(r => r.json())
      .then(setProducts)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []); // ← array vacío: fetch solo en mount, nunca se actualiza

  return { products, isLoading, error };
}
```

```typescript
// ANTES 2 — src/features/admin/hooks/useAdminProducts.ts
export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin-products'], // ← key aislada: TQ no sabe que es la misma API
    queryFn: () => adminProductService.getAll(),
    staleTime: 30_000,
  });
}
```

```typescript
// ANTES 3 — src/features/admin/components/pos/POSView.tsx (inline)
const { data: products = [] } = useQuery({
  queryKey: ['pos-products'], // ← tercera key aislada
  queryFn: async () => {
    const res = await fetch('/api/products?includeInactive=false&includeStock=true');
    return res.json();
  },
  staleTime: 120_000,
});
```

**Resultado**: tres cachés independientes. Una mutación de admin invalida `['admin-products']` pero el catálogo y el POS siguen mostrando la versión antigua. Además, al navegar entre páginas se disparaban fetches redundantes.

---

### Después — hook único con query key factory

```typescript
// DESPUÉS — src/constants/queryKeys.ts

/**
 * Query Key Factory para productos.
 *
 * Las keys son jerárquicas: invalida 'products' invalida todo.
 * Invalida 'products','list' invalida todas las listas.
 * Invalida 'products','list',{includeInactive:true} invalida solo esa variante.
 */
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: { includeInactive?: boolean }) =>
    [...productKeys.lists(), filters ?? {}] as const,
  detail: (id: number) => [...productKeys.all, id] as const,
};
```

```typescript
// DESPUÉS — src/services/productService.ts
import type { Product } from '@/types/product';

export const productService = {
  async fetchProducts(options?: { includeInactive?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (options?.includeInactive) params.set('includeInactive', 'true');

    const url = `/api/products${params.size ? `?${params}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' }); // sin caché HTTP — TQ maneja el caché

    if (!res.ok) throw new Error(`Error al obtener productos: ${res.status}`);
    return res.json();
  },
};
```

```typescript
// DESPUÉS — src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productKeys } from '@/constants/queryKeys';
import { productService } from '@/services/productService';

interface UseProductsOptions {
  includeInactive?: boolean;
}

/**
 * Hook unificado para obtener productos.
 *
 * Catálogo:  useProducts()                        → solo activos, staleTime: Infinity
 * Admin:     useProducts({ includeInactive: true }) → todos, misma caché base
 * POS:       useProducts()                        → igual que catálogo, comparte caché
 *
 * staleTime: Infinity → fetch una vez por sesión.
 * Invalidar productKeys.all invalida TODAS las variantes simultáneamente.
 */
export function useProducts(options?: UseProductsOptions) {
  return useQuery({
    queryKey: productKeys.list({ includeInactive: options?.includeInactive ?? false }),
    queryFn: () => productService.fetchProducts(options),
    staleTime: Infinity, // no refetch automático; invalidar manualmente tras mutaciones
  });
}
```

```typescript
// DESPUÉS — src/features/admin/constants/queryKeys.ts
import { productKeys } from '@/constants/queryKeys';

export const adminKeys = {
  // Las claves de admin para productos DELEGAN a productKeys
  // para que las mutaciones de admin invaliden la caché compartida
  products: () => productKeys.all,
  productsList: () => productKeys.list({ includeInactive: true }),

  // El resto de las claves de admin siguen siendo propias
  stock: () => ['admin', 'stock'] as const,
  stockList: () => [...adminKeys.stock(), 'list'] as const,
  ordersList: () => ['admin', 'orders', 'list'] as const,
  orderDetail: (id: number) => ['admin', 'orders', id] as const,
  // ...
};
```

```typescript
// DESPUÉS — uso en catálogo (src/features/catalog/)
const { data: products = [], isLoading } = useProducts();

// DESPUÉS — uso en admin
const { data: products = [] } = useProducts({ includeInactive: true });

// DESPUÉS — uso en POS (ya no inline, importa el hook compartido)
const { data: products = [] } = useProducts();
```

#### Por qué mejora el código

| Problema anterior | Solución aplicada |
|---|---|
| 3 fetch separados al montar componentes | 1 fetch por sesión, compartido vía caché |
| Invalidación inconsistente tras mutaciones | Una sola invalidación en `productKeys.all` actualiza todo |
| `useEffect` manual sin manejo de errores ni estados de refetch | TanStack Query maneja loading, error, refetch, background updates |
| `_t=timestamp` para cache-busting manual | TanStack Query gestiona staleTime y revalidación |

---

## Bloque 3 — ProductCard como componente compartido (Screaming Architecture)

### Concepto teórico: cuándo promover un componente de feature a shared

En Screaming Architecture, cada feature es autónoma. Sin embargo, cuando un componente es necesario en **dos o más features sin pertenecer conceptualmente a ninguna de ellas**, debe vivir en la capa compartida (`src/components/`).

La regla práctica: si eliminar feature A rompería feature B porque B importa de A, hay un acoplamiento incorrecto que debe resolverse moviendo el componente a shared.

---

### Antes — importación cross-feature

```typescript
// ANTES — src/features/admin/components/pos/POSView.tsx
// El POS (feature admin) importa directamente de feature catalog → acoplamiento incorrecto
import { ProductCard } from '@/features/catalog/components/ProductCard'; // ❌ cross-feature

// Problema adicional: si ProductCard necesita datos solo del catálogo,
// el POS está atado a esa forma de datos aunque sus necesidades sean distintas.
```

### Después — componente en capa compartida

```
src/
├── components/
│   ├── ProductCard.tsx          ← componente promovido a shared
│   └── ui/
│       └── ComboDisclosure.tsx  ← sub-componente interactivo (ver Bloque 4)
├── features/
│   ├── catalog/
│   │   └── components/
│   │       └── ProductList.tsx  → import desde '@/components/ProductCard'
│   └── admin/
│       └── components/
│           └── pos/
│               └── POSView.tsx  → import desde '@/components/ProductCard'
```

```typescript
// DESPUÉS — ambos features importan desde la capa compartida
import { ProductCard } from '@/components/ProductCard'; // ✅ capa shared

// Feature catalog — no cambia la interfaz del componente
// Feature admin/POS — misma interfaz, misma caché de datos
```

#### Por qué mejora el código

1. **Sin acoplamiento entre features**: catalog y admin pueden evolucionar independientemente.
2. **Contrato único**: `ProductCard` tiene una sola definición; las props están tipadas una vez.
3. **Eliminación de ambigüedad**: un desarrollador nuevo sabe dónde buscar `ProductCard` sin explorar árbol de features.

---

## Bloque 4 — Extracción de ComboDisclosure y eliminación de `'use client'` en ProductCard

### Concepto teórico: Server vs. Client Components en Next.js App Router

En Next.js 14+ con App Router, todos los componentes son **Server Components** por defecto. Los Server Components:

- Se renderizan en el servidor (o en build time).
- Tienen acceso directo a bases de datos, filesystem, variables de entorno secretas.
- No pueden usar hooks de React (`useState`, `useEffect`, etc.).
- No pueden usar APIs del navegador (`window`, `document`).
- Su output (HTML) se envía al cliente ya renderizado → mejor LCP (Largest Contentful Paint).

`'use client'` convierte un componente en **Client Component**, lo que significa:

- React hidrata el componente en el navegador.
- Puede usar hooks y APIs de navegador.
- Su código JavaScript se incluye en el bundle del cliente.
- **Toda la subárbol de ese componente se convierte en client-side**.

El principio de diseño es: **"empujar la frontera `'use client'` lo más profundo posible"**. Mantener los componentes padres como Server Components y acotar la interactividad a hojas del árbol.

---

### Antes — `'use client'` innecesariamente alto

```tsx
// ANTES — src/components/ProductCard.tsx
'use client'; // ← necesario SOLO por el useState de combo

import { memo, useState } from 'react';
import type { Product } from '@/types/product';

// El único estado en todo este componente es si el combo está expandido.
// Todo lo demás es rendering puro.
export const ProductCard = memo(function ProductCardBase({
  product,
  quantity,
  onAdd,
  onRemove,
}: ProductCardProps) {
  const [comboExpanded, setComboExpanded] = useState(false); // ← el único hook

  const hasComboItems = product.is_combo && product.combo_items?.length;

  return (
    <div className="...">
      {/* ... renderizado estático del producto ... */}
      {hasComboItems && (
        <div>
          <button onClick={() => setComboExpanded(!comboExpanded)}>
            {comboExpanded ? 'Ver menos' : '¿Qué incluye?'}
          </button>
          {comboExpanded && (
            <ul>
              {product.combo_items!.map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});
```

**El problema**: `'use client'` en `ProductCard` arrastra todo el componente al bundle del cliente, incluyendo toda la lógica de renderizado estático (imágenes, precios, botones de cantidad). Y lo hace solo por un único `useState` con dos valores posibles.

---

### Después — extracción del estado interactivo

```tsx
// DESPUÉS — src/components/ui/ComboDisclosure.tsx
// Este es el único componente que necesita estado → es el único con 'use client'
'use client';

import { useState } from 'react';

interface ComboDisclosureProps {
  items: string[]; // lista de strings: "2x Pan", "500 g Queso", etc.
}

export function ComboDisclosure({ items }: ComboDisclosureProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="text-sm text-blue-600 hover:underline"
        aria-expanded={expanded} // accesibilidad: ARIA correcta
        aria-controls="combo-items-list"
      >
        {expanded ? 'Ver menos' : '¿Qué incluye?'}
      </button>

      {expanded && (
        <ul
          id="combo-items-list"
          className="mt-1 ml-3 text-sm text-gray-600 list-disc"
        >
          {items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// DESPUÉS — src/components/ProductCard.tsx
// Ya no necesita 'use client' — no tiene hooks propios

import Image from 'next/image';
import { ComboDisclosure } from '@/components/ui/ComboDisclosure';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
}

// Sin 'use client', sin hooks — componente de renderizado puro
// React.memo sigue siendo válido para evitar re-renders innecesarios (ver Bloque 7)
function ProductCardBase({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  const hasComboItems = product.is_combo && (product.combo_items?.length ?? 0) > 0;

  return (
    <div className="...">
      {/* ... imagen, precio, botones de cantidad ... */}
      {hasComboItems && (
        // ComboDisclosure es 'use client' internamente
        // La frontera client empieza AQUÍ, no en ProductCard
        <ComboDisclosure items={product.combo_items!} />
      )}
    </div>
  );
}

export const ProductCard = memo(ProductCardBase);
ProductCard.displayName = 'ProductCard';
```

#### Por qué mejora el código

1. **Principio de responsabilidad única (SRP)**: `ProductCard` renderiza un producto; `ComboDisclosure` gestiona la interactividad del combo. Son responsabilidades distintas.
2. **Bundle más pequeño**: `ProductCard` en sí es ahora JavaScript estático. Solo `ComboDisclosure` y los botones de cantidad requieren hidratación.
3. **Corrección arquitectural**: en contextos donde `ProductCard` sea genuinamente un Server Component (si las props no incluyen callbacks), el código ya está preparado. La frontera `'use client'` está en el lugar correcto.
4. **Testabilidad mejorada**: `ComboDisclosure` puede testearse de forma aislada con sus propios casos (expanded/collapsed, lista vacía, lista larga).

> **Nota sobre el caso concreto**: en este proyecto `ProductCard` recibe `onAdd` y `onRemove` como función props, lo que significa que su padre ya es client-side. El beneficio inmediato de bundle es menor. Sin embargo, la refactorización es arquitecturalmente correcta y prepara el componente para contextos donde sí haya ganancia real de SSR.

---

## Bloque 5 — Fix de `usePOSCart` para productos por peso

### Concepto teórico: modelado de dominio en hooks de carrito

Un carrito de compras maneja cantidades. Pero "cantidad" tiene semánticas distintas según el tipo de producto:

- **Unidades**: cantidad = número entero de ítems (1, 2, 3...)
- **Kg**: cantidad = gramos (500 g, 1000 g, 1500 g...) — precio por kg
- **100gr**: cantidad = gramos (100 g, 200 g, 300 g...) — precio por 100 g

Si el hook del carrito ignora el `sale_type` y siempre suma/resta 1, el resultado es:

- "+" en un producto de kg suma 1 gramo en vez de 500 g (el usuario nunca llega a cantidades útiles).
- El total calculado como `price * quantity` es incorrecto para peso (precio × gramos ≠ precio × unidades de venta).

---

### Antes — lógica incorrecta para productos por peso

```typescript
// ANTES — src/features/admin/hooks/usePOSCart.ts

const add = useCallback((product: Product) => {
  setCart(prev => {
    const currentQty = prev[product.id]?.qty ?? 0;

    // ❌ Siempre suma 1, sin importar el sale_type
    // Para kg: suma 1 gramo. Para 100gr: suma 1 gramo.
    // Incorrecto: debería sumar 500 g (kg) o 100 g (100gr)
    return {
      ...prev,
      [product.id]: { product, qty: currentQty + 1 },
    };
  });
}, []);

// Cálculo de total — también incorrecto para peso
const total = useMemo(
  () => entries.reduce((sum, { product, qty }) => {
    // ❌ Para kg: price ($/kg) × qty (gramos) = resultado incorrecto
    // Ej: precio 500 $/kg × 500 gramos = 250.000 (debería ser 250)
    return sum + product.price * qty;
  }, 0),
  [entries]
);
```

### Después — lógica correcta por tipo de venta

```typescript
// DESPUÉS — src/features/admin/hooks/usePOSCart.ts
import { getQuantityPerClick } from '@/utils/productUtils'; // utilidad del Bloque 1d

/**
 * Calcula el subtotal de un ítem según su tipo de venta.
 *
 * - unit:  precio por unidad × cantidad de unidades
 * - kg:    precio por kg × (gramos / 1000)
 * - 100gr: precio por 100g × (gramos / 100)
 */
function computeItemTotal(product: Product, qty: number): number {
  switch (product.sale_type) {
    case 'kg':    return product.price * (qty / 1000);
    case '100gr': return product.price * (qty / 100);
    default:      return product.price * qty;           // 'unit'
  }
}

const add = useCallback((product: Product) => {
  setCart(prev => {
    const currentQty = prev[product.id]?.qty ?? 0;

    // ✅ Usa getQuantityPerClick para el incremento correcto:
    // sale_type === 'kg'    → delta = 500  (500 gramos = 0.5 kg por clic)
    // sale_type === '100gr' → delta = 100  (100 gramos por clic)
    // sale_type === 'unit'  → delta = 1    (1 unidad por clic)
    const delta = getQuantityPerClick(product);

    return {
      ...prev,
      [product.id]: { product, qty: currentQty + delta },
    };
  });
}, []);

const remove = useCallback((product: Product) => {
  setCart(prev => {
    const currentQty = prev[product.id]?.qty ?? 0;
    const delta = getQuantityPerClick(product);
    const newQty = currentQty - delta;

    if (newQty <= 0) {
      // Eliminar el ítem del carrito si la cantidad llega a 0
      const { [product.id]: _, ...rest } = prev;
      return rest;
    }

    return { ...prev, [product.id]: { product, qty: newQty } };
  });
}, []);

// ✅ Total correcto para todos los tipos de venta
const total = useMemo(
  () => entries.reduce((sum, { product, qty }) =>
    sum + computeItemTotal(product, qty), 0),
  [entries]
);
```

#### Por qué mejora el código

1. **Corrección de comportamiento**: un cliente que compra 0.5 kg de queso ahora ve `$250` (precio: $500/kg) en vez de `$250.000`.
2. **Reutilización de dominio**: `getQuantityPerClick` encapsula la regla de negocio en un lugar; `computeItemTotal` encapsula la fórmula de precio. Ninguno está inline.
3. **Simetría con el carrito del catálogo**: el catálogo público ya usaba la lógica correcta. El POS ahora es consistente.

---

## Bloque 6 — Refactorización de FilterButtons (CategoryNav)

### Concepto teórico: Single Responsibility Principle en componentes React

El principio de responsabilidad única aplicado a React establece que un componente debe tener una sola razón para cambiar. Cuando un componente combina:

1. **Obtención de datos** (fetch, query)
2. **Lógica de comportamiento** (observers, scroll, timers)
3. **Renderizado** (markup, estilos)

...cualquier cambio en cualquiera de estas dimensiones requiere modificar el mismo archivo, aumentando el riesgo de regresiones y dificultando los tests.

**Fetch en Server Components**: Next.js App Router permite hacer fetch de datos directamente en componentes del servidor usando `async/await`. Esto elimina la waterfall de hidratación: el HTML llega al cliente ya con los datos, sin que el cliente tenga que esperar al mount del componente, ejecutar el fetch, y volver a renderizar.

**Custom hooks como unidades de comportamiento**: extraer lógica compleja (como un `IntersectionObserver`) a un hook nombrado (`useScrollSpy`) cumple dos objetivos: la lógica es reutilizable y el nombre documenta la intención.

---

### Antes — un componente con 3 responsabilidades

```typescript
// ANTES — src/features/catalog/components/FilterButtons.tsx
'use client';

// ── Responsabilidad 1: Obtención de datos ──────────────────────────────────
const { data: categories = [] } = useQuery({
  queryKey: ['categories-public-with-subs'],
  queryFn: async () => {
    const res = await fetch('/api/categories');
    return res.json();
  },
  staleTime: 5 * 60 * 1000,
});

// ── Responsabilidad 2: Scroll spy con observers ────────────────────────────
const [activeCatName, setActiveCatName] = useState<string | null>(null);

const observeSection = useCallback((catName: string, node: HTMLElement | null) => {
  // ... ref callback para registrar cada sección en el IntersectionObserver
}, []);

useEffect(() => {
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveCatName(visible[0].target.getAttribute('data-cat') ?? null);
    },
    { threshold: [0.1, 0.5], rootMargin: '-80px 0px 0px 0px' }
  );
  // ... registrar todos los nodos observados
  return () => io.disconnect();
}, [observeSection]);

// También usa MutationObserver para detectar cuando los productos montan
useEffect(() => {
  const mo = new MutationObserver(() => { /* re-registrar secciones */ });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => mo.disconnect();
}, []);

// ── Responsabilidad 3: Auto-scroll del chip activo ─────────────────────────
const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
useEffect(() => {
  const chip = chipRefs.current.get(activeCatName ?? '');
  chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}, [activeCatName]);

// ── Renderizado mezclado con toda la lógica anterior ──────────────────────
return (
  <div>
    {categories.map(cat => (
      <button
        key={cat.id}
        ref={el => chipRefs.current.set(cat.name, el!)}
        onClick={() => scrollToSection(cat.name)}
        className={activeCatName === cat.name ? 'active' : ''}
      >
        {cat.name}
        {cat.subcategories.map(sub => <span key={sub.id}>{sub.name}</span>)}
      </button>
    ))}
  </div>
);
```

### Después — responsabilidades separadas

```typescript
// DESPUÉS — estructura de archivos
src/features/catalog/components/
├── CategoryNav.tsx          ← async Server Component: solo obtiene datos y compone
├── FilterButtons.tsx         ← Client Component: orquesta hooks, recibe props
├── hooks/
│   ├── useScrollSpy.ts       ← custom hook: IntersectionObserver + MutationObserver
│   └── useCategoryScrollSync.ts ← custom hook: auto-scroll del chip activo
└── ui/
    ├── CategoryChip.tsx      ← componente de presentación puro (con forwardRef)
    └── SubcategoryBadge.tsx  ← componente de presentación puro (con forwardRef)
```

```typescript
// DESPUÉS — CategoryNav.tsx (async Server Component)
// No usa 'use client' — se ejecuta en el servidor, los datos llegan al cliente en el HTML inicial
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FilterButtons } from './FilterButtons';
import type { CategoryWithSubsPublic } from '@/features/catalog/types/category.types';

export default async function CategoryNav() {
  // Fetch directo a Supabase — sin waterfall de hidratación
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, image_url, subcategories(id, name)')
    .eq('active', true)
    .order('name', { ascending: true });

  const categories: CategoryWithSubsPublic[] = (data as CategoryWithSubsPublic[]) ?? [];

  return (
    <nav aria-label="Filtrar por categoría" className="sticky top-0 z-10 bg-white shadow-sm">
      {/* Los datos ya están disponibles — FilterButtons los recibe como prop */}
      <FilterButtons categories={categories} />
    </nav>
  );
}
```

```typescript
// DESPUÉS — FilterButtons.tsx (Client Component orquestador)
'use client';

import { useScrollSpy } from '../hooks/useScrollSpy';
import { useCategoryScrollSync } from '../hooks/useCategoryScrollSync';
import { CategoryChip } from './ui/CategoryChip';
import type { CategoryWithSubsPublic } from '@/features/catalog/types/category.types';

interface FilterButtonsProps {
  categories: CategoryWithSubsPublic[]; // datos ya disponibles, sin fetch
}

export function FilterButtons({ categories }: FilterButtonsProps) {
  // Cada responsabilidad de comportamiento en su propio hook nombrado
  const { activeCatName, registerSection } = useScrollSpy();
  const { chipRef } = useCategoryScrollSync(activeCatName);

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {categories.map(cat => (
        <CategoryChip
          key={cat.id}
          category={cat}
          isActive={activeCatName === cat.name}
          ref={el => chipRef(cat.name, el)} // forwardRef para el auto-scroll
          onSectionRef={registerSection}     // para el IntersectionObserver
        />
      ))}
    </div>
  );
}
```

```typescript
// DESPUÉS — useScrollSpy.ts (custom hook con comportamiento aislado)
import { useCallback, useEffect, useRef, useState } from 'react';

export function useScrollSpy() {
  const [activeCatName, setActiveCatName] = useState<string | null>(null);
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());
  const ioRef = useRef<IntersectionObserver | null>(null);

  const buildObserver = useCallback(() => {
    ioRef.current?.disconnect();
    ioRef.current = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActiveCatName(top.target.getAttribute('data-cat') ?? null);
      },
      { threshold: [0.1, 0.5], rootMargin: '-80px 0px 0px 0px' }
    );
    sectionsRef.current.forEach(node => ioRef.current!.observe(node));
  }, []);

  const registerSection = useCallback((catName: string, node: HTMLElement | null) => {
    if (node) {
      sectionsRef.current.set(catName, node);
    } else {
      sectionsRef.current.delete(catName);
    }
    buildObserver(); // reconstruir con los nodos actualizados
  }, [buildObserver]);

  // MutationObserver para detectar cuando las secciones montan tras la hidratación
  useEffect(() => {
    const mo = new MutationObserver(buildObserver);
    mo.observe(document.body, { childList: true, subtree: false });
    return () => mo.disconnect();
  }, [buildObserver]);

  useEffect(() => () => ioRef.current?.disconnect(), []);

  return { activeCatName, registerSection };
}
```

```tsx
// DESPUÉS — CategoryChip.tsx (puro, con forwardRef para que el padre acceda al DOM)
import { forwardRef } from 'react';
import type { CategoryWithSubsPublic } from '@/features/catalog/types/category.types';

interface CategoryChipProps {
  category: CategoryWithSubsPublic;
  isActive: boolean;
  onSectionRef: (catName: string, node: HTMLElement | null) => void;
}

// forwardRef expone el DOM del botón al componente padre (necesario para auto-scroll)
export const CategoryChip = forwardRef<HTMLButtonElement, CategoryChipProps>(
  function CategoryChip({ category, isActive, onSectionRef }, ref) {
    return (
      <button
        ref={ref}
        className={`chip ${isActive ? 'chip-active' : ''}`}
        onClick={() => onSectionRef(category.name, null)} // scroll to section
        aria-pressed={isActive}
      >
        {category.name}
      </button>
    );
  }
);
CategoryChip.displayName = 'CategoryChip';
```

#### Por qué mejora el código

1. **Sin waterfall**: Los datos de categorías llegan en el HTML inicial. El cliente no espera al mount + fetch + re-render.
2. **Testabilidad**: `useScrollSpy` puede testearse con jsdom sin montar `FilterButtons` completo. `CategoryChip` puede testearse como componente puro.
3. **Legibilidad**: `CategoryNav` comunica "aquí se obtienen datos". `FilterButtons` comunica "aquí se orquesta la interactividad". `CategoryChip` comunica "aquí se renderiza un chip".
4. **`forwardRef`**: permite que `useCategoryScrollSync` acceda al nodo DOM del chip para el scroll sin romper la encapsulación del componente.

---

## Bloque 7 — Optimización de re-renders en ProductList

### Concepto teórico: React reconciliation, `React.memo`, `useCallback` y frecuencias de cambio

Este es el cambio de mayor impacto en performance de la aplicación.

#### Cómo funciona React reconciliation

React re-renderiza un componente cuando:
1. Su estado interno cambia.
2. Sus props cambian (por referencia, no por valor).
3. Su componente padre re-renderiza (a menos que esté envuelto en `memo`).

**`React.memo`** es un Higher Order Component que agrega memoización por props: si las props del re-render son referencialmente iguales a las del render anterior, React omite el renderizado. La clave es **referential equality**: para primitivos (`number`, `string`) compara por valor; para objetos y funciones compara por referencia de memoria.

**`useCallback`** memoiza una función entre renders, devolviendo la misma referencia mientras sus dependencias no cambien. Sin `useCallback`, cada render del padre crea una nueva función en memoria, rompiendo la memoización de `memo` en el hijo.

**`useCallback` y `memo` son un par inseparable**: `memo` sin `useCallback` en el padre es inútil para props de tipo función.

#### El problema de acoplar frecuencias de cambio

Una de las reglas de rendimiento más importantes en React: **no mezclar datos de diferentes frecuencias de cambio en el mismo `useMemo`**.

- Los datos del catálogo (`products`) cambian raramente (cuando el admin modifica algo).
- Los datos del carrito (`cartQuantities`) cambian en cada tap del usuario.

Si se combinan en el mismo `useMemo`, el recálculo ocurre tan frecuentemente como el más variable de los dos.

---

### Antes — O(n) re-renders por cada tap

```typescript
// ANTES — src/features/catalog/components/ProductListContainer.tsx

// ❌ PROBLEMA 1: se mezclan dos fuentes con frecuencias de cambio muy distintas
// products: cambia raramente (admin actualiza)
// getItemQuantity: cambia en CADA tap del usuario
const productsWithQuantity = useMemo(() => {
  return activeProducts.map(product => ({
    ...product,                              // spread-clone: crea un NUEVO objeto por producto
    quantity: getItemQuantity(product.id),   // inyecta dato del carrito en el dato del catálogo
  }));
}, [activeProducts, getItemQuantity]);
//                  ^^^^^^^^^^^^^^^^ cambia en cada tap → useMemo recomputa en cada tap
//                                   → 150 objetos nuevos
//                                   → referencia del array cambia
//                                   → ProductList recibe nuevas props
//                                   → todo el árbol de categorías se re-renderiza
```

```tsx
// ANTES — src/features/catalog/components/ProductList.tsx
// ❌ PROBLEMA 2: inline lambdas crean nuevas funciones en cada render
<ProductCard
  key={product.id}
  product={product}            // ya incluye quantity
  onAdd={() => onAdd(product.id)}    // nueva función en cada render → memo falla
  onRemove={() => onRemove(product.id)} // nueva función en cada render → memo falla
/>
```

```
Cascada de re-renders ANTES — O(n) por tap:

tap "+" en Producto X
  → state.items cambia
  → useCart re-renderiza ProductListContainer
  → getItemQuantity tiene nueva referencia (depende de state.items)
  → productsWithQuantity recalcula: .map() sobre 150 productos → 150 objetos nuevos
  → ProductList recibe nueva prop `products` (nueva referencia)
  → grouped recalcula: reorganiza 150 productos en categorías
  → ProductCard recibe onAdd y onRemove como lambdas nuevas
  → React.memo no puede bailar out (función props son nuevas)
  → 150 ProductCards re-renderizan
  → DOM diffing en 150 componentes
  → Solo Producto X cambió visualmente, pero 149 re-renders fueron innecesarios
```

---

### Después — O(1) re-renders por cada tap

```typescript
// DESPUÉS — src/features/catalog/components/ProductListContainer.tsx

// ✅ FIX 1: separar datos por frecuencia de cambio

// products: stable (staleTime: Infinity en TanStack Query)
const { data: products = [] } = useProducts();

// cartQuantities: Map<id, qty> — cambia en cada tap, pero es una estructura plana
const cartQuantities = useMemo(
  () => new Map(state.items.map(item => [item.id, item.quantity])),
  [state.items] // solo recomputa cuando el carrito cambia, y es barato (O(n) simple)
);

// Pasamos products y cartQuantities como props SEPARADAS
// → ProductList puede memoizar `grouped` sin que el carrito lo invalide
```

```typescript
// DESPUÉS — src/features/catalog/components/ProductList.tsx

interface ProductListProps {
  products: Product[];                  // estables — sin quantity embebida
  cartQuantities: Map<number, number>;  // dinámicas — separadas
  onAdd: (id: number) => void;          // estables con useCallback en padre
  onRemove: (id: number) => void;       // estables con useCallback en padre
  mainCategories: string[];
}

// ✅ FIX 2: grouped ya NO depende del carrito
// Solo recalcula cuando cambia el catálogo (raramente)
const grouped = useMemo(() => {
  return mainCategories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat] = products.filter(p => p.main_category === cat);
    return acc;
  }, {});
}, [products, mainCategories]); // ← sin cartQuantities, sin funciones
//  ^^^^^^^^  ^^^^^^^^^^^^^^^ solo dependen de datos estables
```

```tsx
// DESPUÉS — renderizado de cada card
<ProductCard
  key={product.id}
  product={product}          // ✅ referencia estable (TQ no recrea objetos si no cambian)
  quantity={cartQuantities.get(product.id) ?? 0} // O(1) lookup en Map
  onAdd={onAdd}              // ✅ referencia estable (useCallback en padre)
  onRemove={onRemove}        // ✅ referencia estable (useCallback en padre)
/>
```

```tsx
// DESPUÉS — ProductCard con React.memo
// La memoización AHORA funciona porque:
// - product: misma referencia (TQ no recrea si no cambió)
// - quantity: mismo número primitivo (comparación por valor)
// - onAdd: misma referencia (useCallback)
// - onRemove: misma referencia (useCallback)
// → Solo el ProductCard cuya quantity cambió re-renderiza

function ProductCardBase({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  // ... renderizado del card
}

export const ProductCard = memo(ProductCardBase);
ProductCard.displayName = 'ProductCard'; // necesario para React DevTools con memo
```

```typescript
// DESPUÉS — useCallback en ProductListContainer (el padre)
// Sin useCallback, memo en ProductCard es inútil
const handleAdd = useCallback((id: number) => {
  dispatch({ type: 'ADD_ITEM', productId: id });
}, []); // ← sin dependencias: la función es estable durante toda la sesión

const handleRemove = useCallback((id: number) => {
  dispatch({ type: 'REMOVE_ITEM', productId: id });
}, []); // ← sin dependencias: estable
```

```
Cascada de re-renders DESPUÉS — O(1) por tap:

tap "+" en Producto X
  → state.items cambia
  → cartQuantities = new Map(...) — O(n) pero barato (solo primitivos)
  → ProductList re-renderiza (recibe cartQuantities nueva)
  → grouped: useMemo baila out (products y mainCategories no cambiaron) ✅
  → 150 ProductCards evaluados por memo:
      → 149 cards: product? ✅ igual | quantity? ✅ igual | onAdd/onRemove? ✅ igual → SKIP
      →   1 card (Producto X): quantity? cambió (ej: 0 → 1) → RE-RENDER ✅
  → Solo 1 DOM update: el card de Producto X
```

#### Por qué el `Map` es mejor que el objeto para este caso

```typescript
// Opción A: objeto
const quantities: { [id: number]: number } = {};
// Lookup: quantities[product.id] — O(1) pero crea un nuevo objeto cada render

// Opción B: Map (elegida)
const quantities = new Map<number, number>();
// Lookup: quantities.get(product.id) — O(1)
// Ventaja: Map con claves numéricas es semánticamente correcto
// El spread del objeto {...quantities, [id]: newQty} crea referencias nuevas para todos los valores
// Map.set() muta en lugar pero el nuevo Map creado en useMemo tiene referencia nueva → React lo detecta correctamente
```

#### Resumen del impacto

| Métrica | Antes | Después |
|---|---|---|
| Re-renders por tap en carrito | 150 (todos los cards) | 1 (solo el card modificado) |
| `useMemo grouped` recalcula en cada tap | Sí (dependía de `getItemQuantity`) | No (solo cambia si el catálogo cambia) |
| `React.memo` funcionaba en ProductCard | No (funciones inline nuevas en cada render) | Sí (refs estables con `useCallback`) |
| `onAdd`/`onRemove` crean nuevas funciones por render | Sí (lambdas inline) | No (`useCallback` con deps vacías) |

---

## Tabla de Resumen

| # | Cambio | Archivos afectados | Tipo de mejora | Impacto |
|---|---|---|---|---|
| 1a | `normalize()` centralizada | `src/utils/normalize.ts` + 3 consumidores | DRY, corrección de bug silencioso | Medio |
| 1b | `formatPrice()` con `Intl.NumberFormat` | `src/utils/formatPrice.ts` + 10+ consumidores | DRY, corrección regional, performance | Alto |
| 1c | `formatQuantity()` a capa shared | `src/utils/formatQuantity.ts` + re-export | DRY, Screaming Architecture | Bajo |
| 1d | `getQuantityPerClick`, `getWeightType`, `isProductByWeight` a shared | `src/utils/productUtils.ts` + re-export | DRY, Screaming Architecture | Medio |
| 2 | Unificación de fetch de productos | `src/hooks/useProducts.ts`, `src/services/productService.ts`, `src/constants/queryKeys.ts` | Arquitectura TanStack Query, caché consistente | Alto |
| 3 | `ProductCard` promovido a capa shared | `src/components/ProductCard.tsx` | Screaming Architecture, eliminación de acoplamiento cross-feature | Medio |
| 4 | Extracción de `ComboDisclosure`, eliminación de `'use client'` en `ProductCard` | `src/components/ui/ComboDisclosure.tsx`, `src/components/ProductCard.tsx` | SRP, Server/Client boundary | Medio |
| 5 | Fix de `usePOSCart` para productos por peso | `src/features/admin/hooks/usePOSCart.ts` | Corrección de bug crítico | Crítico |
| 6 | Refactorización de `FilterButtons` → `CategoryNav` + hooks | `CategoryNav.tsx`, `FilterButtons.tsx`, `useScrollSpy.ts`, `useCategoryScrollSync.ts`, `CategoryChip.tsx` | SRP, Server Component data fetching, custom hooks | Alto |
| 7 | Optimización de re-renders en `ProductList` | `ProductListContainer.tsx`, `ProductList.tsx`, `ProductCard.tsx` | `React.memo` + `useCallback` + separación de frecuencias | Crítico |

---

## Referencias

### Documentación oficial

- [React — `memo`](https://react.dev/reference/react/memo)
- [React — `useCallback`](https://react.dev/reference/react/useCallback)
- [React — `useMemo`](https://react.dev/reference/react/useMemo)
- [React — `forwardRef`](https://react.dev/reference/react/forwardRef)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js — Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [TanStack Query — Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [TanStack Query — `staleTime`](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [MDN — `Intl.NumberFormat`](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [MDN — `String.prototype.normalize`](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
