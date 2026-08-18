# Performance — LCP Iteration 4

## Contexto

Cuarta iteración. El problema raíz del LCP está identificado con precisión.

| Métrica | Baseline | Iter 1 | Iter 2 | Iter 3 | Objetivo |
|---|---|---|---|---|---|
| Score | 63 | 65-74 | 64 | 61 | ≥ 85 |
| LCP | ~48s | 6-26s | 50.7s | 42.3s | < 4s |

### Causa raíz confirmada

`Header.tsx` es un Client Component (`'use client'`) porque necesita `useState` y `useEffect` para detectar el scroll. Esto tiene una consecuencia crítica:

**`next/image` con `priority={true}` dentro de un Client Component NO genera preload en el SSR.**

El browser recibe el HTML sin ninguna referencia a la imagen del logo. La descubre recién cuando React hidrata el componente en el cliente — después de descargar y ejecutar todo el JS. Por eso `fetchpriority=high should be applied` persiste en todos los reportes de Lighthouse.

El `<link rel="preload">` en `layout.tsx` apunta a la URL correcta, pero hay un segundo problema: `next/image` puede estar generando internamente una URL diferente a la del preload (distinto `w_` u otros parámetros). Si las URLs no son idénticas carácter a carácter, el browser hace dos requests en lugar de reutilizar el preload.

### Estructura actual de `Header.tsx`

```
Header (use client)
├── useState(isScrolled)
├── useEffect → scroll listener
├── Header inicial (visible al cargar)
│   └── Image priority={true} ← necesita SSR pero está en client
└── Header sticky (oculto inicialmente)
    └── Image loading="lazy" ← correcto
```

---

## Fase 1 — Auditoría (NO tocar código todavía)

### 1.1 Verificar la URL generada por `getCloudinaryUrl`

Ejecutar mentalmente `getCloudinaryUrl('https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png', 256)` y comparar el resultado con la URL del preload en `layout.tsx`:

```
https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto,w_256/v1763599423/logo-og_pydhrd.png
```

¿Son idénticas? Si no lo son, el preload actual no sirve de nada.

### 1.2 Verificar qué URL genera `next/image` en el HTML

`next/image` con `unoptimized: true` (o sin dominio configurado en `next.config`) pasa la URL sin modificar. Con dominio configurado, la transforma a través del Image Optimization de Next.js. Verificar en `next.config` cómo está configurado `images` para `res.cloudinary.com`.

### 1.3 Confirmar que el scroll logic es la única razón del `'use client'`

Revisar `Header.tsx` completo. ¿Hay algún otro hook o estado que requiera client además del scroll (`isScrolled`, `handleScroll`)? Listar todos los hooks usados.

---

## Fase 2 — Refactor: separar scroll logic del logo

El objetivo es que el logo del header inicial pueda ser renderizado en el servidor.

### Fix A — Extraer el scroll behavior a un wrapper CSS

La forma más simple y performante: reemplazar el `useState/useEffect` de scroll por CSS puro usando `position: sticky` y la pseudo-clase `:has()` o un scroll-driven animation. Esto eliminaría el `'use client'` completamente.

Evaluar si el comportamiento actual (header grande → header sticky al scrollear) es reproducible con CSS puro. Si es viable, implementarlo.

### Fix B — Si CSS puro no es viable: separar en dos componentes

Crear dos componentes separados:

**`HeaderLogo.tsx`** (Server Component):
```tsx
// Sin 'use client' — se renderiza en el servidor
// Contiene SOLO la imagen del logo inicial con priority
import Image from 'next/image';

export function HeaderLogo() {
  return (
    <Image
      src={getCloudinaryUrl('...logo-og_pydhrd.png', 256)}
      alt="Market del Cevil Logo"
      width={128}
      height={128}
      className="rounded-2xl"
      priority
    />
  );
}
```

**`HeaderClient.tsx`** (Client Component):
```tsx
'use client';
// Contiene el scroll logic, el header sticky, y los controles de auth
// El logo sticky puede seguir siendo lazy aquí
```

**`Header.tsx`** (Server Component):
```tsx
// Compone ambos — sin 'use client'
import { HeaderLogo } from './HeaderLogo';
import { HeaderClient } from './HeaderClient';

export function Header() {
  return (
    <>
      <div className="text-center ...">
        <HeaderLogo /> {/* Server — genera preload en SSR */}
        <div>...</div>
      </div>
      <HeaderClient /> {/* Client — scroll + sticky */}
    </>
  );
}
```

### Fix C — Actualizar el preload en `layout.tsx`

Una vez confirmada la URL exacta que genera `next/image` con `priority={true}` en el Server Component, actualizar el `<link rel="preload">` en `layout.tsx` para que coincida **exactamente**.

Si `next/image` con `priority` en un Server Component ya genera el preload automáticamente en el `<head>`, el preload manual en `layout.tsx` puede ser redundante — verificar y eliminar si es el caso para evitar requests duplicados.

---

## Fase 3 — Verificación

### 3.1 Inspeccionar el HTML generado

Después del refactor, hacer `Ctrl+U` en el browser y verificar en el `<head>`:

```html
<!-- Debe aparecer algo así, generado por next/image automáticamente -->
<link rel="preload" as="image" fetchpriority="high" href="..." />
```

Si aparece, `next/image` está generando el preload en SSR correctamente.

### 3.2 Verificar en Network tab

Filtrar por `Img` — la imagen del logo debe aparecer al inicio del waterfall, en paralelo con los primeros recursos, **no** después del JS bundle.

### 3.3 Correr Lighthouse 3 veces

Criterio de éxito (las 3 ejecuciones):
- LCP < 4s
- Score ≥ 80
- `fetchpriority=high should be applied` **desaparece** del reporte

---

## Notas

- Stack: Next.js + TypeScript + Supabase + Cloudinary
- `Header.tsx` está en `'use client'` por el scroll logic — ese es el único bloqueante
- El logo sticky (`w_64`, `loading="lazy"`) está correcto — no modificar
- Respetar Screaming Architecture
- `useIsAuthenticated` del authStore también requiere client — tenerlo en cuenta al separar componentes
- No modificar optimizaciones de iteraciones anteriores (paginación SSR, Cloudinary en productos)
