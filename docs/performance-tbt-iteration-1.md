# Performance — TBT Iteration 1

## Contexto

LCP resuelto (2.7s en condiciones reales). El problema actual es el **Total Blocking Time (TBT)**.

| Métrica | Valor actual | Objetivo |
|---|---|---|
| TBT | 980ms | < 200ms |
| Score | 71 | ≥ 85 |
| LCP | 2.7s | ✅ resuelto |

TBT de 980ms significa que el usuario espera ~1 segundo sin poder interactuar después de que la página visualmente cargó.

---

## Datos de Lighthouse — Minimize main-thread work (20.3s total)

| Categoría | Tiempo |
|---|---|
| Other | 15,182ms |
| Rendering | 2,381ms |
| Script Evaluation | 1,777ms |
| Style & Layout | 571ms |
| Garbage Collection | 219ms |
| Script Parsing & Compilation | 135ms |
| Parse HTML & CSS | 54ms |

## Datos de Lighthouse — Reduce JavaScript execution time (1.8s)

| Origen | CPU Total | Script Eval | Script Parse |
|---|---|---|---|
| Unattributable | 13,300ms | 11ms | 0ms |
| vercel.app (1st party) | 6,524ms | 1,378ms | 69ms |
| → chunk 5964-3827e5675982a839.js | 1,165ms | 1,020ms | 17ms |
| → chunk 5367-37d52f8af0aaf452.js | 229ms | 202ms | 22ms |
| → chunk 4bd1b696-602635ee57868870.js | 98ms | 67ms | 13ms |
| Google Tag Manager | 356ms | 314ms | 38ms |

**El chunk 5964 con 1,020ms de Script Evaluation es el más pesado del código propio.**

---

## Objetivo de esta iteración

No implementar nada todavía. El objetivo es que Claude Code **analice el código, identifique las causas del TBT y plantee hipótesis con propuestas concretas**.

---

## Fase 1 — Análisis del chunk pesado

### 1.1 Identificar qué contiene el chunk 5964

Buscar en el build output o en el source map qué módulos componen el chunk `5964-3827e5675982a839.js`. Estrategias:

- Correr `next build` y revisar el output de bundle analysis
- Si hay `@next/bundle-analyzer` configurado, usarlo
- Si no, inspeccionar el chunk directamente en el browser (DevTools → Sources → buscar el chunk) e identificar los módulos más grandes

Responder: ¿qué componentes o librerías están en ese chunk?

### 1.2 Mapear todos los Client Components (`'use client'`)

Listar todos los archivos que tienen `'use client'` en el proyecto. Para cada uno, evaluar:

- ¿Realmente necesita ser client? ¿Usa hooks, eventos, o estado del browser?
- ¿Se renderiza en la página principal (`/`)?
- ¿Qué tan pesado es (líneas de código, dependencias importadas)?

Responder: ¿hay Client Components que podrían convertirse en Server Components?

### 1.3 Analizar el patrón de imports en los componentes principales

Revisar la página principal (`page.tsx`) y sus componentes directos. Verificar:

- ¿Hay imports de librerías pesadas (date-fns, lodash, recharts, etc.) en componentes que se cargan en el bundle inicial?
- ¿Hay componentes que solo se usan en rutas secundarias pero están importados en la página principal?
- ¿Hay barrel files (`index.ts`) que importan todo aunque solo se use una parte?

### 1.4 Analizar Google Tag Manager / GA4

Verificar cómo está configurado GTM/GA4 en el proyecto:

- ¿Usa `next/script` con `strategy`? ¿Cuál?
- ¿Se carga en el layout principal o en un componente separado?
- ¿Hay múltiples scripts de analytics cargando simultáneamente?

---

## Fase 2 — Análisis de hydration

### 2.1 Cuantificar el costo de hydration

El "Unattributable" de 13,300ms en CPU es casi seguro React hydration. Esto es proporcional a la cantidad de Client Components y al tamaño del HTML inicial.

Verificar:
- ¿Cuántos componentes en la página principal son `'use client'`?
- ¿Hay componentes client que envuelven grandes árboles de componentes innecesariamente?
- ¿Se usa `Suspense` en algún lugar para diferir hydration?

### 2.2 Identificar oportunidades de lazy loading de componentes

Listar componentes de la página principal que:
- No son visibles above-the-fold
- No son críticos para la interacción inicial
- Son candidatos a `React.lazy` + `Suspense` o `dynamic` de Next.js con `{ ssr: false }`

---

## Fase 3 — Entregable esperado

Al finalizar el análisis, Claude Code debe producir un reporte con:

1. **Contenido del chunk 5964** — qué hay ahí y por qué es tan pesado
2. **Lista de Client Components innecesarios** — candidatos a convertir a Server Components
3. **Imports pesados en el bundle inicial** — librerías o módulos que podrían cargarse lazy
4. **Estado actual de GTM/GA4** — estrategia de carga y si es optimizable
5. **Hipótesis priorizadas** — ordenadas por impacto estimado en TBT, con propuesta de implementación para cada una

**No implementar nada en esta fase.** Solo análisis y propuestas. La implementación se hará en una iteración separada una vez validadas las hipótesis.

---

## Notas

- Stack: Next.js + TypeScript + Supabase + Cloudinary
- Screaming Architecture — respetar estructura de carpetas
- No tocar optimizaciones de LCP ya implementadas
- El TBT se mide con Lighthouse en modo "DevTools throttling (advanced)" + Network "No throttling"
- Variación natural de Lighthouse: ±50-100ms en TBT entre ejecuciones
