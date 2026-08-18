# Performance — LCP Iteration 2

## Contexto

Segunda iteración de optimización de LCP. La iteración anterior resolvió parcialmente el problema:

| Métrica | Baseline (antes) | Iteración 1 | Objetivo |
|---|---|---|---|
| Score | 63-65 | 65-74 (inestable) | ≥ 85 |
| LCP | ~48s | 6.1s – 26.3s (inestable) | < 4s |
| FCP | 3.3s | 1.1s – 3.3s | < 2s |
| TBT | 250ms | 190-230ms | < 150ms |

La inestabilidad del LCP entre ejecuciones indica que el problema no está completamente resuelto.

---

## Diagnóstico confirmado por Lighthouse

El reporte de Lighthouse sobre el elemento LCP (`img.rounded-2xl`) muestra:

- ✅ `Request is discoverable in initial document` — la URL de la imagen ya está en el HTML del SSR
- ❌ `fetchpriority=high should be applied` — el browser encuentra la imagen pero la descarga en cola normal, sin prioridad
- ❌ `lazy load not applied` — Lighthouse detecta que el elemento LCP puede tener `loading="lazy"` todavía activo

---

## Fase 1 — Auditoría (NO tocar código todavía)

### 1.1 Localizar el elemento LCP

Buscar el componente que renderiza `img.rounded-2xl`. Puede ser `ProductCard`, `ProductListItem`, o similar. Verificar:

- ¿Tiene `loading="lazy"` explícito?
- ¿Usa `next/image` o `<img>` nativo?
- ¿Tiene `fetchPriority` o `priority` configurado?
- ¿El `priority` agregado en la iteración anterior se aplicó correctamente en este componente?

### 1.2 Verificar cómo se aplica `priority` actualmente

En la iteración anterior se agregó `priority` a las primeras imágenes. Verificar:

- ¿Cómo se determina qué imagen recibe `priority`? ¿Por índice, por posición, por categoría?
- ¿El primer producto renderizado en SSR siempre recibe `priority`?
- ¿Hay algún caso donde el componente con `priority` no sea el primero visible en pantalla?

### 1.3 Verificar `fetchPriority` en el HTML generado

Si es posible, inspeccionar el HTML generado (ver source de la página) y buscar el primer `<img>` del catálogo. Confirmar si tiene:
- `fetchpriority="high"`
- `loading="eager"` o ausencia de `loading="lazy"`

---

## Fase 2 — Correcciones específicas

Aplicar **únicamente** estos dos cambios en el componente identificado:

### Fix A — `fetchPriority="high"`

En el componente que renderiza la imagen LCP (primer producto visible), agregar `fetchPriority="high"`:

- Si usa `next/image`: el prop `priority={true}` ya debería generar `fetchpriority="high"` automáticamente. Verificar que esté aplicado correctamente.
- Si usa `<img>` nativo: agregar `fetchPriority="high"` explícitamente.

### Fix B — Remover `loading="lazy"` del elemento LCP

El elemento LCP nunca debe tener `loading="lazy"`. Verificar que el primer producto:

- Si usa `next/image` con `priority={true}`: el lazy loading se deshabilita automáticamente. Confirmar que no haya override.
- Si usa `<img>` nativo: cambiar a `loading="eager"` o remover el atributo.

**Importante**: estos cambios deben aplicarse **solo al primer producto visible**, no a todos. Los productos que están fuera del viewport inicial deben mantener lazy loading para no degradar el rendimiento general.

---

## Fase 3 — Verificación adicional

### 3.1 Revisar imágenes de categorías (carousel superior)

El carousel de categorías con íconos (Almacén, Congelados, Kiosko, etc.) también está above-the-fold. Verificar:

- ¿Esas imágenes tienen `loading="lazy"`?
- ¿Alguna de ellas podría ser el elemento LCP en algunas ejecuciones?

Si tienen lazy loading, removerlo o agregar `fetchPriority="high"` en las primeras visibles.

### 3.2 Verificar `sizes` en el elemento LCP

Confirmar que la imagen LCP tiene el atributo `sizes` configurado correctamente según su tamaño de display real. Sin `sizes`, el browser puede descargar una versión más grande de lo necesario.

---

## Criterio de éxito

Correr Lighthouse 3 veces seguidas (Mobile, Navigation, Clear storage) y verificar que los 3 resultados sean consistentes:

- LCP < 4s en las 3 ejecuciones
- Score ≥ 80 en las 3 ejecuciones
- `fetchpriority=high should be applied` desaparece del reporte

Si después de estos fixes el LCP sigue siendo inestable, el problema está en Cloudinary (cold start) y necesitamos una estrategia diferente.

---

## Notas

- Stack: Next.js + TypeScript + Supabase + Cloudinary
- El elemento LCP identificado es `img.rounded-2xl`
- No modificar la lógica de paginación SSR ni las optimizaciones de la iteración anterior
- Respetar Screaming Architecture — no mover archivos de lugar
