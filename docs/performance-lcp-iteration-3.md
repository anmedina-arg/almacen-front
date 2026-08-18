# Performance — LCP Iteration 3

## Contexto

Tercera iteración. El elemento LCP identificado es el **logo del almacén** en `Header.tsx`, servido desde Cloudinary sin caché caliente.

| Métrica | Baseline | Iter 1 | Iter 2 | Objetivo |
|---|---|---|---|---|
| Score | 63 | 65-74 | 64 | ≥ 85 |
| LCP | ~48s | 6-26s | 50.7s | < 4s |
| Elemento LCP | imagen producto | imagen producto | **logo header** | — |

### Causa raíz confirmada

El logo está hardcodeado en `Header.tsx` como URL raw de Cloudinary:
```
https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png
```

Después de la iteración 2 se aplica `getCloudinaryUrl` pero el problema persiste porque:
1. Cloudinary hace la transformación en el primer request (cold start) — puede tardar varios segundos
2. El `fetchpriority="high"` no se está generando correctamente en el HTML final
3. El browser no puede hacer preload del logo porque no conoce la URL hasta que parsea el `<img>` en el DOM

### Decisión de arquitectura

El logo se mantiene en Cloudinary (necesario para multi-tenant futuro). La solución es **preload + precalentamiento**, no mover a `/public`.

---

## Fase 1 — Auditoría (NO tocar código todavía)

### 1.1 Verificar el HTML generado

Inspeccionar el source de la página (`Ctrl+U`) y buscar:
- ¿Hay algún `<link rel="preload">` para el logo?
- ¿El `<img>` del logo tiene `fetchpriority="high"`?
- ¿El `<img>` del logo tiene `loading="lazy"`?
- ¿La URL del logo en el HTML es la raw de Cloudinary o la transformada?

### 1.2 Verificar `Header.tsx`

Localizar el componente Header. Confirmar:
- ¿Usa `next/image` o `<img>` nativo?
- ¿Tiene `priority` prop si es `next/image`?
- ¿Cómo se obtiene la URL del logo — hardcodeada, desde config, desde DB?

### 1.3 Verificar `next.config`

Revisar si `res.cloudinary.com` está en la lista de dominios permitidos para `next/image`. Si no está, `next/image` no puede optimizar imágenes de ese dominio.

---

## Fase 2 — Correcciones

### Fix A — Preload del logo en `<head>`

En `layout.tsx` o `_document.tsx` (según la estructura del proyecto), agregar un `<link rel="preload">` para el logo **antes** de cualquier otro recurso:

```html
<link
  rel="preload"
  as="image"
  href="https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto,w_256/v1763599423/logo-og_pydhrd.png"
  fetchpriority="high"
/>
```

Esto le dice al browser que descargue el logo inmediatamente al parsear el HTML, sin esperar a que el JS monte el componente Header.

**Importante**: la URL del preload debe ser **exactamente igual** a la URL del `<img>` en Header — si difieren un solo carácter, el browser hace dos requests en lugar de reutilizar el preload.

### Fix B — `fetchPriority` en el `<img>` del logo

En `Header.tsx`, asegurarse de que el elemento de imagen tenga `fetchPriority="high"` explícito:

- Si usa `next/image`: agregar `priority={true}` y verificar que genere `fetchpriority="high"` en el HTML. Si no lo genera, considerar reemplazar por `<img>` nativo solo para el logo.
- Si usa `<img>` nativo: agregar `fetchPriority="high"` y `loading="eager"` explícitamente.

### Fix C — Precalentamiento de Cloudinary (cache warming)

El cold start ocurre cuando Cloudinary no tiene la transformación en caché. Para eliminarlo:

Agregar una llamada de precalentamiento en el servidor durante el build o en una API route. La estrategia más simple es agregar la URL del logo transformada como un `<link rel="preload">` en el SSR — el primer usuario que cargue después de un deploy puede sufrir el cold start, pero todos los demás se benefician del caché de Cloudinary.

Para eliminar el cold start incluso para el primer usuario post-deploy, agregar en `next.config.ts` una función que haga un `fetch` a la URL transformada del logo durante el build:

```typescript
// En next.config.ts, después del build
// fetch de precalentamiento para cachear la transformación en Cloudinary
```

Evaluar si esto es viable según la estructura del proyecto. Si no, dejarlo como nota para implementar en CI/CD.

### Fix D — Migrar logo a `next/image` si usa `<img>` nativo

Si el logo usa `<img>` nativo, migrarlo a `next/image` con:
- `priority={true}`
- `width` y `height` explícitos (evita CLS)
- `sizes` apropiado

Verificar que `res.cloudinary.com` esté en `images.remotePatterns` en `next.config`.

---

## Fase 3 — Verificación

Después de aplicar los fixes, inspeccionar el source (`Ctrl+U`) y confirmar:
- Existe `<link rel="preload" as="image">` para el logo en el `<head>`
- El `<img>` del logo tiene `fetchpriority="high"`
- La URL del preload y del `<img>` son idénticas

Luego correr Lighthouse 3 veces (Mobile, Navigation, Clear storage):

**Criterio de éxito:**
- LCP < 4s en las 3 ejecuciones
- Score ≥ 80 en las 3 ejecuciones
- `fetchpriority=high should be applied` desaparece del reporte de Lighthouse

Si el LCP sigue siendo inestable después de estos fixes, el problema es exclusivamente Cloudinary cold start post-deploy y la solución es el precalentamiento en CI/CD (fuera del scope de esta iteración).

---

## Notas

- Stack: Next.js + TypeScript + Supabase + Cloudinary
- El logo se mantiene en Cloudinary — decisión de arquitectura para multi-tenant futuro
- No modificar optimizaciones de iteraciones anteriores
- Respetar Screaming Architecture
- El `NEXT_PUBLIC_TENANT_ID` define el tenant — en el futuro el logo vendrá de config por tenant, no hardcodeado
