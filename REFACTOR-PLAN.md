# Análisis Completo y Plan de Refactorización - Market Cevil

## Fase 1: Descubrimiento Automático

### 1.1 Análisis del Stack Actual

- Detecta todas las tecnologías, librerías y dependencias actuales
- Identifica versiones y configuraciones
- Mapea la arquitectura actual (carpetas, patrones, componentes)
- Analiza package.json, tsconfig.json, next.config.js, etc.

### 1.2 Evaluación del Estado Actual

- Identifica qué está bien y qué necesita mejora
- Detecta patrones de manejo de estado actual
- Analiza cómo se hace data fetching actualmente
- Revisa gestión de side effects y async operations

### 1.3 Recomendaciones de Tecnologías

Basándote en el código actual y el objetivo multi-tenant SaaS, sugiere:

**Gestión de Estado:**

- ¿Zustand, Redux Toolkit, Jotai, o mantener React Context?
- Justifica la recomendación según complejidad actual

**Data Fetching & Cache:**

- ¿TanStack Query (React Query), SWR, o Apollo Client?
- Considerando integración con Supabase

**Feature Flags:**

- ¿Solución self-hosted (Unleash, Flagsmith) o servicio (LaunchDarkly, PostHog)?
- ¿O implementación custom con Supabase?

**Multi-tenancy:**

- ¿Necesitamos ORM adicional (Prisma, Drizzle)?
- ¿Middleware de Next.js para tenant resolution?
- ¿Librerías de isolación de datos?

**Monorepo (si aplica):**

- ¿Turborepo, Nx, o mantener monolito modular?

**Testing:**

- Stack de testing recomendado (Vitest, Playwright, Testing Library)

**Developer Experience:**

- ESLint configs, Prettier, Husky
- Herramientas de CI/CD

---

## Fase 2: Plan de Implementación

Después del análisis, genera:

### 2.1 Stack Tecnológico Recomendado

```yaml
Estado actual → Estado propuesto
Justificación de cada cambio
Riesgos y beneficios
```

### 2.2 Plan de Migración por Fases

```markdown
## 🎯 Fase 1: Quick Wins (Semana 1-2)

- [ ] P0 🟢 Tarea sin dependencias que mejora inmediatamente

## 🏗️ Fase 2: Fundamentos (Semana 3-4)

- [ ] P0 🔴 Implementar tecnologías core nuevas

## 🚩 Fase 3: Features Avanzadas (Semana 5-6)

- [ ] P1 🟡 Feature flags, multi-tenancy

## ✨ Fase 4: Optimización (Semana 7+)

- [ ] P2 🟢 Mejoras de DX, testing, monitoreo
```

### 2.3 Documento para `.claude/instructions.md`

Genera un instructions.md completo con:

- Stack final decidido
- Convenciones basadas en las nuevas tecnologías
- Patrones a seguir

---

## Criterios de Decisión

Para cada tecnología que sugieras, evalúa:

1. **Complejidad de adopción** (Learning curve)
2. **Integración con stack actual** (Especialmente Supabase)
3. **Overhead** (¿Vale la pena para el tamaño del proyecto?)
4. **Comunidad y mantenimiento**
5. **Alineación con objetivo multi-tenant SaaS**

---

## Output Esperado

### Documento 1: `STACK_ANALYSIS.md`

```markdown
## 📊 Stack Actual Detectado

[Análisis detallado]

## 🎯 Stack Propuesto

[Recomendaciones con justificación]

## 📈 Comparativa

[Tabla comparativa]
```

### Documento 2: `MIGRATION_PLAN.md`

```markdown
## Plan de Migración Detallado

[Tareas priorizadas]
```

### Documento 3: `.claude/instructions.md`

```markdown
## Instrucciones actualizadas para el proyecto

[Contexto completo con stack decidido]
```

---

## Modo de Análisis

1. **Lee el proyecto completo** sin hacer suposiciones
2. **Sé específico**: no sugieras tecnologías "por defecto", justifica cada una
3. **Considera el contexto**: proyecto de un comercio local que quiere escalar
4. **Pragmatismo**: no over-engineer, pero prepara para crecimiento
5. **Prioriza**: no todo se debe cambiar, identifica qué sí necesita cambio
