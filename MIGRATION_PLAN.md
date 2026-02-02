# 🗺️ Plan de Migración - Market Cevil

## Estrategia de Migración

**Principio**: Migración incremental sin breaking changes
**Duración Total**: 6-8 semanas (tiempo part-time)
**Enfoque**: Quick wins primero, arquitectura después

---

## 🎯 Fase 1: Quick Wins & Fundamentos (Semana 1-2)

**Objetivo**: Mejoras inmediatas sin cambios arquitectónicos

### P0 🟢 Setup de Herramientas de Desarrollo

**Prioridad**: Alta - Mejora DX inmediatamente

- [ ] **Instalar y configurar Prettier** (30 min)
  ```bash
  npm install -D prettier prettier-plugin-tailwindcss
  ```
  - Crear `.prettierrc.json`
  - Formatear todo el código existente
  - **Beneficio**: Consistencia automática

- [ ] **Configurar Husky + lint-staged** (30 min)
  ```bash
  npm install -D husky lint-staged
  npx husky init
  ```
  - Pre-commit hook para linting
  - Pre-push hook para type-check
  - **Beneficio**: Prevenir commits con errores

- [ ] **Actualizar ESLint config** (20 min)
  - Agregar reglas para hooks
  - Agregar reglas de accesibilidad (eslint-plugin-jsx-a11y)
  - **Beneficio**: Detectar bugs comunes

**Tiempo Total**: 1.5 horas
**Impacto**: DX mejorado desde día 1

---

### P0 🟢 Limpieza de Código Existente

**Prioridad**: Alta - Mejora calidad sin cambios arquitectónicos

- [ ] **Eliminar console.count en producción** (15 min)
  - Archivos: `ProductListContainer.tsx`, `ProductList.tsx`
  - Reemplazar con conditional logging basado en `NODE_ENV`
  - **Beneficio**: Performance + código limpio

- [ ] **Consolidar ProductCard variants** (2 horas)
  - Unificar `ProductCard.tsx` y `ProductSquareCard.tsx`
  - Crear prop `variant: 'list' | 'grid'`
  - **Beneficio**: -50% código duplicado

- [ ] **Extraer constantes mágicas** (1 hora)
  - Crear `src/constants/config.ts`
  - Mover debounce delays, cache times, etc.
  - **Beneficio**: Configuración centralizada

- [ ] **Agregar Error Boundaries** (1 hora)
  ```tsx
  // src/components/ErrorBoundary.tsx
  export class ErrorBoundary extends React.Component {
    // Catch rendering errors
  }
  ```
  - Wrap app en layout.tsx
  - **Beneficio**: App no crashea por errores de componentes

**Tiempo Total**: 4.5 horas
**Impacto**: Codebase más mantenible

---

### P0 🟡 Generar Tipos de Supabase

**Prioridad**: Alta - Type safety crítico

- [ ] **Instalar Supabase CLI** (10 min)
  ```bash
  npm install -D supabase
  ```

- [ ] **Generar tipos desde schema** (20 min)
  ```bash
  npx supabase gen types typescript --project-id [YOUR_PROJECT_ID] > src/types/supabase.ts
  ```

- [ ] **Integrar tipos en código existente** (1 hora)
  - Actualizar `src/types/index.ts`
  - Tipar queries de Supabase
  - **Beneficio**: Autocomplete + type errors antes de runtime

**Tiempo Total**: 1.5 horas
**Impacto**: -50% bugs relacionados con datos

---

### P1 🟢 Mejorar Manejo de Errores

**Prioridad**: Media - UX importante

- [ ] **Crear componente de Error UI** (1 hora)
  ```tsx
  // src/components/ErrorMessage.tsx
  export function ErrorMessage({ error, onRetry }: Props) {
    return (
      <div className="error-container">
        <p>{error.message}</p>
        <button onClick={onRetry}>Reintentar</button>
      </div>
    )
  }
  ```

- [ ] **Mostrar errores en useProducts** (30 min)
  - Integrar ErrorMessage en ProductListContainer
  - **Beneficio**: Usuario sabe qué pasó cuando falla

- [ ] **Agregar toast notifications** (2 horas)
  - Instalar `sonner` (1 KB toast library)
  - Notificar acciones de carrito
  - **Beneficio**: Feedback inmediato

**Tiempo Total**: 3.5 horas
**Impacto**: Mejor UX en casos de error

---

### Resumen Fase 1

| Tarea | Tiempo | Impacto | Dependencias |
|-------|--------|---------|--------------|
| DX Tools | 1.5h | Alto | Ninguna |
| Limpieza Código | 4.5h | Medio | Ninguna |
| Tipos Supabase | 1.5h | Alto | Ninguna |
| Error Handling | 3.5h | Medio | Ninguna |

**Total Fase 1**: 11 horas (~1-2 semanas part-time)
**Bloqueadores**: Ninguno - todo es independiente

---

## 🏗️ Fase 2: Gestión de Estado & Data Fetching (Semana 3-4)

**Objetivo**: Implementar Zustand + TanStack Query

### P0 🔴 Migrar a Zustand para Cart State

**Prioridad**: Crítica - Elimina prop drilling

- [ ] **Instalar Zustand** (5 min)
  ```bash
  npm install zustand
  ```

- [ ] **Crear cart store** (2 horas)
  ```typescript
  // src/stores/cartStore.ts
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'

  interface CartStore {
    items: CartItem[]
    addItem: (product: Product, quantity: number) => void
    removeItem: (productId: string) => void
    updateQuantity: (productId: string, quantity: number) => void
    clearCart: () => void
    // Computed values
    totalItems: number
    totalPrice: number
  }

  export const useCartStore = create<CartStore>()(
    persist(
      (set, get) => ({
        items: [],

        addItem: (product, quantity) =>
          set((state) => {
            const existing = state.items.find((item) => item.product.id === product.id)
            if (existing) {
              return {
                items: state.items.map((item) =>
                  item.product.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ),
              }
            }
            return { items: [...state.items, { product, quantity }] }
          }),

        removeItem: (productId) =>
          set((state) => ({
            items: state.items.filter((item) => item.product.id !== productId),
          })),

        updateQuantity: (productId, quantity) =>
          set((state) => ({
            items: state.items.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
          })),

        clearCart: () => set({ items: [] }),

        get totalItems() {
          return get().items.reduce((sum, item) => sum + item.quantity, 0)
        },

        get totalPrice() {
          return get().items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          )
        },
      }),
      { name: 'cart-storage' }
    )
  )
  ```

- [ ] **Migrar useCart hook** (1 hora)
  - Deprecar `src/hooks/useCart.ts`
  - Actualizar componentes para usar `useCartStore`
  - **Beneficio**: Persistencia automática + no más prop drilling

- [ ] **Actualizar componentes** (2 horas)
  - ProductListContainer: eliminar cart state
  - ProductList: eliminar props de cart
  - ProductCard: usar `useCartStore` directamente
  - **Beneficio**: -30% props, código más limpio

- [ ] **Testing manual** (1 hora)
  - Verificar persistencia en localStorage
  - Probar add/remove/update
  - Probar WhatsApp con nuevo store

**Tiempo Total**: 6 horas
**Impacto**: Arquitectura más limpia, persistencia gratis

---

### P0 🔴 Implementar TanStack Query

**Prioridad**: Crítica - Cache automático

- [ ] **Instalar TanStack Query** (5 min)
  ```bash
  npm install @tanstack/react-query @tanstack/react-query-devtools
  ```

- [ ] **Configurar QueryClientProvider** (30 min)
  ```typescript
  // src/app/layout.tsx
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
  import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000,   // 10 minutos
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  })

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </body>
      </html>
    )
  }
  ```

- [ ] **Migrar useProducts hook** (1 hora)
  ```typescript
  // src/hooks/useProducts.ts
  import { useQuery } from '@tanstack/react-query'
  import { productDataSource } from '@/data/products'

  export const useProducts = () => {
    return useQuery({
      queryKey: ['products'],
      queryFn: () => productDataSource.getAll(),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })
  }
  ```

- [ ] **Actualizar ProductListContainer** (1 hora)
  - Reemplazar useState/useEffect con useQuery
  - Usar `isLoading`, `isError`, `refetch` de React Query
  - **Beneficio**: -50% código boilerplate

- [ ] **Agregar retry UI** (30 min)
  - Mostrar botón "Reintentar" cuando query falla
  - Usar `refetch()` de React Query
  - **Beneficio**: UX mejorado en errores

- [ ] **Configurar prefetching** (1 hora)
  - Prefetch products en server component
  - Hidratar cache en cliente
  - **Beneficio**: Instant load

**Tiempo Total**: 4 horas
**Impacto**: Cache inteligente, UX instantáneo

---

### P1 🟡 Crear Supabase Client para Cliente

**Prioridad**: Media - Necesario para mutaciones futuras

- [ ] **Crear client-side Supabase client** (30 min)
  ```typescript
  // src/lib/supabase/client.ts
  import { createBrowserClient } from '@supabase/ssr'

  export const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  ```

- [ ] **Crear hook useTenantSupabase** (30 min)
  ```typescript
  // Para futuro multi-tenant
  export function useTenantSupabase() {
    const tenantId = useTenantId()
    const supabase = supabaseClient

    // Set tenant context (para RLS)
    React.useEffect(() => {
      supabase.rpc('set_tenant_context', { tenant_id: tenantId })
    }, [tenantId])

    return supabase
  }
  ```

**Tiempo Total**: 1 hora
**Impacto**: Preparación para multi-tenant

---

### Resumen Fase 2

| Tarea | Tiempo | Impacto | Dependencias |
|-------|--------|---------|--------------|
| Zustand Store | 6h | Alto | Ninguna |
| TanStack Query | 4h | Alto | Ninguna |
| Supabase Client | 1h | Bajo | Ninguna |

**Total Fase 2**: 11 horas (~1-2 semanas part-time)
**Bloqueadores**: Ninguno - migraciones independientes

---

## 🚩 Fase 3: Multi-Tenancy & Feature Flags (Semana 5-6)

**Objetivo**: Preparar arquitectura multi-tenant

### P0 🔴 Implementar Tenant Resolution

**Prioridad**: Crítica para SaaS

- [ ] **Crear middleware de Next.js** (2 horas)
  - Leer `MIGRATION_PLAN.md` sección "Middleware + RLS"
  - Implementar resolución de tenant desde hostname
  - **Beneficio**: Cada cliente tiene su subdominio

- [ ] **Crear tenant context** (1 hora)
  ```typescript
  // src/contexts/TenantContext.tsx
  const TenantContext = createContext<TenantContextValue>()

  export function TenantProvider({ children, tenantId }) {
    return (
      <TenantContext.Provider value={{ tenantId }}>
        {children}
      </TenantContext.Provider>
    )
  }

  export const useTenant = () => useContext(TenantContext)
  ```

- [ ] **Configurar Supabase RLS** (3 horas)
  - Crear migration para RLS policies
  - Agregar tenant_id a tablas
  - Testear aislamiento
  - **Beneficio**: Seguridad garantizada

**Tiempo Total**: 6 horas
**Impacto**: Multi-tenant funcional

---

### P0 🔴 Implementar Feature Flags

**Prioridad**: Alta - Control dinámico

- [ ] **Crear tabla de feature flags** (1 hora)
  ```sql
  CREATE TABLE feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id),
    flag_key text NOT NULL,
    enabled boolean DEFAULT false,
    config jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, flag_key)
  );
  ```

- [ ] **Crear hook useFeatureFlag** (2 horas)
  - Integrar con TanStack Query
  - Cache de 10 minutos
  - **Beneficio**: Runtime toggles

- [ ] **Migrar feature flags existentes** (1 hora)
  - Mover de `instance.config.ts` a DB
  - Actualizar referencias en código
  - **Beneficio**: Configuración por tenant

**Tiempo Total**: 4 horas
**Impacto**: Control granular por cliente

---

### P1 🟡 Crear Admin UI para Feature Flags

**Prioridad**: Media - Mejora DX para ops

- [ ] **Crear página /admin/features** (3 horas)
  - Listar feature flags por tenant
  - Toggle on/off
  - **Beneficio**: No necesitas deployar para cambiar config

**Tiempo Total**: 3 horas
**Impacto**: Operaciones más ágiles

---

### Resumen Fase 3

| Tarea | Tiempo | Impacto | Dependencias |
|-------|--------|---------|--------------|
| Middleware Multi-tenant | 6h | Crítico | Ninguna |
| Feature Flags DB | 4h | Alto | TanStack Query (Fase 2) |
| Admin UI | 3h | Medio | Feature Flags DB |

**Total Fase 3**: 13 horas (~2 semanas part-time)
**Bloqueadores**: Requiere Fase 2 completada (TanStack Query)

---

## ✨ Fase 4: Testing & Optimización (Semana 7+)

**Objetivo**: Estabilidad y calidad

### P1 🟢 Setup de Testing

**Prioridad**: Media - Prevenir regresiones

- [ ] **Instalar Vitest** (30 min)
  ```bash
  npm install -D vitest @vitejs/plugin-react jsdom
  npm install -D @testing-library/react @testing-library/jest-dom
  ```

- [ ] **Configurar vitest.config.ts** (30 min)
  - Setup jsdom environment
  - Configurar path aliases
  - **Beneficio**: Tests rápidos

- [ ] **Escribir tests para utilities** (3 horas)
  - `productUtils.ts`: formatPrice, getWeightType
  - `messageUtils.ts`: generateWhatsAppMessage
  - **Beneficio**: Funciones críticas cubiertas

- [ ] **Escribir tests para stores** (2 horas)
  - cartStore: addItem, removeItem, updateQuantity
  - **Beneficio**: Lógica de negocio testeada

- [ ] **Instalar Playwright** (1 hora)
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```

- [ ] **Escribir E2E tests** (4 horas)
  - Búsqueda de productos
  - Agregar al carrito
  - Generar mensaje WhatsApp
  - **Beneficio**: Flujos críticos cubiertos

**Tiempo Total**: 11 horas
**Impacto**: Confianza en deploys

---

### P2 🟢 Optimizaciones de Performance

**Prioridad**: Baja - Proyecto ya es rápido

- [ ] **Implementar Image Optimization** (2 horas)
  - Migrar a next/image con blur placeholder
  - Configurar Cloudinary loader
  - **Beneficio**: -50% LCP

- [ ] **Lazy load de componentes** (1 hora)
  - Modal de confirmación con React.lazy
  - **Beneficio**: -10% bundle inicial

- [ ] **Agregar sitemap.xml** (30 min)
  - Generar dinámicamente con categorías
  - **Beneficio**: SEO mejorado

**Tiempo Total**: 3.5 horas
**Impacto**: Métricas Core Web Vitals mejoradas

---

### P2 🟡 Monitoreo & Analytics

**Prioridad**: Baja - Nice to have

- [ ] **Configurar Sentry** (1 hora)
  - Error tracking automático
  - **Beneficio**: Detectar bugs en producción

- [ ] **Agregar Product Analytics** (2 horas)
  - Track: product_view, add_to_cart, order_sent
  - Integrar con GA4
  - **Beneficio**: Insights de uso

**Tiempo Total**: 3 horas
**Impacto**: Visibilidad de errores y uso

---

### Resumen Fase 4

| Tarea | Tiempo | Impacto | Dependencias |
|-------|--------|---------|--------------|
| Testing Setup | 11h | Alto | Ninguna |
| Performance | 3.5h | Medio | Ninguna |
| Monitoring | 3h | Bajo | Ninguna |

**Total Fase 4**: 17.5 horas (~2-3 semanas part-time)
**Bloqueadores**: Ninguno - todo es aditivo

---

## 📊 Resumen Global

### Timeline

```
Semana 1-2:  Fase 1 - Quick Wins (11h)
             ├─ DX Tools
             ├─ Limpieza
             └─ Error Handling

Semana 3-4:  Fase 2 - Estado & Data (11h)
             ├─ Zustand
             └─ TanStack Query

Semana 5-6:  Fase 3 - Multi-tenancy (13h)
             ├─ Middleware
             └─ Feature Flags

Semana 7+:   Fase 4 - Testing (17.5h)
             ├─ Vitest
             ├─ Playwright
             └─ Optimizaciones
```

**Total**: 52.5 horas (~6-8 semanas part-time a 8h/semana)

---

### Priorización por Impacto

#### Must Have (P0) - 35h

1. **Zustand** (6h) - Elimina prop drilling
2. **TanStack Query** (4h) - Cache automático
3. **Tipos Supabase** (1.5h) - Type safety
4. **Multi-tenant Middleware** (6h) - Crítico para SaaS
5. **Feature Flags DB** (4h) - Control dinámico
6. **DX Tools** (1.5h) - Calidad desde día 1
7. **Limpieza Código** (4.5h) - Mantenibilidad
8. **Error Handling** (3.5h) - UX básico
9. **Supabase Client** (1h) - Preparación mutaciones
10. **Testing Setup** (11h) - Confianza deploys

#### Should Have (P1) - 10h

1. **Admin UI** (3h) - Operaciones
2. **Performance Opts** (3.5h) - Core Web Vitals
3. **E2E Tests** (4h) - Críticos cubiertos

#### Nice to Have (P2) - 7.5h

1. **Monitoring** (3h) - Error tracking
2. **Analytics Avanzado** (2h) - Product insights
3. **Lazy Loading** (1h) - Bundle size
4. **Sitemap** (0.5h) - SEO

---

## 🎯 Hitos de Validación

### Hito 1: DX Mejorado (Fin Semana 2)

**Criterios**:
- ✅ Prettier formatea automáticamente
- ✅ Pre-commit hooks funcionando
- ✅ Tipos de Supabase generados
- ✅ Errores mostrados a usuarios

**Métrica**: Developer satisfaction +50%

---

### Hito 2: Arquitectura Moderna (Fin Semana 4)

**Criterios**:
- ✅ Zustand store implementado
- ✅ TanStack Query cacheando requests
- ✅ Persistencia de carrito funcional
- ✅ DevTools de React Query visibles

**Métrica**: Cache hit rate 70%+

---

### Hito 3: Multi-tenant Ready (Fin Semana 6)

**Criterios**:
- ✅ Middleware resuelve tenant desde subdomain
- ✅ RLS policies configuradas
- ✅ Feature flags en DB
- ✅ Admin UI funcional

**Métrica**: Tiempo de onboarding nuevo cliente < 5 min

---

### Hito 4: Producción-Ready (Fin Semana 8)

**Criterios**:
- ✅ 70%+ code coverage en utils/stores
- ✅ E2E tests pasando
- ✅ Core Web Vitals > 90
- ✅ Sentry reportando errores

**Métrica**: 0 bugs críticos en producción

---

## 🚨 Riesgos & Mitigaciones

### Riesgo 1: Breaking Changes en Migración

**Probabilidad**: Media
**Impacto**: Alto

**Mitigación**:
- Migración incremental (componente por componente)
- Feature flags para rollback
- Testing exhaustivo antes de deploy

---

### Riesgo 2: RLS Policies Mal Configuradas

**Probabilidad**: Media
**Impacto**: Crítico (data leak)

**Mitigación**:
- Testing con múltiples tenants en staging
- Auditoría de queries con diferentes usuarios
- Automated tests para verificar aislamiento

---

### Riesgo 3: Performance Degradation

**Probabilidad**: Baja
**Impacto**: Medio

**Mitigación**:
- Lighthouse CI en cada PR
- Monitoring de bundle size
- Lazy loading de features pesados

---

## ✅ Checklist de Completitud

### Pre-migración

- [ ] Backup de base de datos
- [ ] Feature branch creada
- [ ] Staging environment configurado

### Post-migración (cada fase)

- [ ] Tests pasando
- [ ] Bundle size < 300 KB
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] README actualizado

### Pre-deploy a producción

- [ ] Todas las fases completadas
- [ ] Migrations de DB aplicadas
- [ ] Environment variables configuradas
- [ ] Rollback plan documentado
- [ ] Monitoring configurado

---

## 📚 Recursos de Referencia

- **Zustand**: https://docs.pmnd.rs/zustand/
- **TanStack Query**: https://tanstack.com/query/latest
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Next.js Middleware**: https://nextjs.org/docs/app/building-your-application/routing/middleware
- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar este plan** con el equipo
2. **Crear issues en GitHub** para tracking
3. **Comenzar Fase 1** (Quick Wins)
4. **Iterar semanalmente** con retrospectiva

**Documento de soporte**: Ver `.claude/instructions.md` para convenciones del nuevo stack.
