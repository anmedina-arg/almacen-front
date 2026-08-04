# Auditoría de Performance — LCP Crítico

## Contexto

Se realizaron mediciones con Lighthouse (Mobile, Navigation) en dos entornos del proyecto Market Cevil:

| Métrica | Dev (rama `dev`) | Prod (rama `main`) |
|---|---|---|
| Score | 65 | 63 |
| First Contentful Paint | 3.3s | 3.4s |
| **Largest Contentful Paint** | **47.6s** | **48.8s** |
| Total Blocking Time | 190ms | 250ms |
| Cumulative Layout Shift | 0 | 0 |
| Speed Index | 3.3s | 3.4s |

El LCP de ~48 segundos es el problema dominante. Es el responsable del score bajo y no fue afectado por las optimizaciones ya implementadas (paginación SSR, Cloudinary, queries paralelas).

---

## Objetivo

Identificar la causa raíz del LCP elevado y aplicar la corrección mínima necesaria para reducirlo significativamente.

---

## Fase 1 — Auditoría (NO tocar código todavía)

Antes de escribir ninguna línea de código, realizar las siguientes verificaciones en orden:

### 1.1 Identificar el elemento LCP

Buscar en el código el componente que renderiza las imágenes de productos en el catálogo principal (probablemente `ProductCard` o similar). Determinar:

- ¿Usa `next/image` o `<img>` nativo?
- ¿Tiene `loading="lazy"` explícito o implícito?
- ¿Tiene `priority` en alguna imagen?

### 1.2 Analizar `getCloudinaryUrl`

Localizar la función utilitaria `getCloudinaryUrl(url, width)`. Verificar:

- ¿Incluye `f_auto,q_auto` en la transformación?
- ¿El `width` que se le pasa coincide con el tamaño real de display?
- ¿Se genera algún `srcset` o solo una URL fija?

### 1.3 Revisar el componente de imagen above-the-fold

El primer producto visible al cargar (top of fold) es el candidato más probable al LCP. Verificar:

- ¿Ese primer producto recibe algún tratamiento diferenciado respecto al resto?
- ¿Hay algún `placeholder` o `blurDataURL` configurado?
- ¿El componente usa `sizes` attribute correctamente?

### 1.4 Revisar la carga SSR de la primera categoría

Con la paginación implementada en `dev`, el SSR carga solo la primera categoría. Verificar:

- ¿Cuántos productos trae esa primera categoría?
- ¿El HTML renderizado incluye las URLs de imágenes directamente o se resuelven en el cliente?

---

## Fase 2 — Diagnóstico

Con los hallazgos de la Fase 1, determinar cuál de estas causas aplica (puede ser más de una):

**A) Lazy loading en imágenes above-the-fold**
Si las primeras imágenes visibles tienen `loading="lazy"`, el browser las posterga hasta después del JS — infla el LCP artificialmente.

**B) Falta de `priority` en Next.js Image**
`next/image` sin `priority` no hace preload. El browser descubre la imagen tarde en el proceso de renderizado.

**C) URL de Cloudinary resuelta en cliente**
Si `getCloudinaryUrl` se ejecuta en el cliente (no en SSR), el browser no puede hacer preload porque no conoce la URL final hasta que el JS corre.

**D) Tamaño de imagen desproporcionado**
Si el `width` pasado a Cloudinary es mayor al display real, se transfiere más datos de los necesarios.

**E) Sin `sizes` attribute**
Sin `sizes`, el browser asume el peor caso y descarga la versión más grande disponible.

---

## Fase 3 — Implementación

Una vez identificadas las causas, aplicar **solo las correcciones necesarias** según los hallazgos. No refactorizar código que no esté relacionado con el LCP.

Guías por causa:

- **A/B**: Agregar `priority` en el primer producto de cada lista renderizada en SSR. No agregar `priority` a todos los productos — solo los primeros N visibles above-the-fold (generalmente 2-4).
- **C**: Si la URL se resuelve en cliente, mover `getCloudinaryUrl` para que también se ejecute en el servidor durante SSR, de modo que la URL final esté en el HTML inicial.
- **D**: Ajustar el `width` de Cloudinary al tamaño de display real × DPR máximo razonable (2x).
- **E**: Agregar `sizes` apropiado según el breakpoint del componente.

---

## Criterio de éxito

Después de aplicar las correcciones, correr Lighthouse nuevamente en el mismo entorno (Mobile, Navigation, Clear storage). El objetivo mínimo es:

- LCP < 10s
- Score ≥ 75

Si el LCP no baja de 10s con estas correcciones, reportar los hallazgos para una segunda iteración.

---

## Notas

- Stack: Next.js + TypeScript + Supabase + Cloudinary
- Imágenes de productos servidas via Cloudinary con transformaciones automáticas (`f_auto`, `q_auto`)
- Arquitectura Screaming Architecture — respetar la estructura de carpetas existente
- No modificar la lógica de paginación SSR implementada en esta rama
