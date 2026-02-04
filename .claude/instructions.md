# Claude Code Instructions - Market Cevil

## Contexto del Proyecto

**Nombre**: Market Cevil (almacen-front)
**Tipo**: E-commerce Product Catalog con integración WhatsApp
**Objetivo**: Plataforma multi-tenant SaaS para comercios locales
**Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + Supabase

### Descripción

Catálogo de productos online que permite a usuarios:
- Navegar productos por categorías
- Buscar productos (normalización de texto con diacríticos)
- Agregar productos a carrito
- Generar mensaje de pedido para WhatsApp
- Instalar como PWA

**Modelo de Negocio**: Multi-tenant - cada cliente tiene su propia instancia (subdomain) con productos independientes.

---

## Stack Tecnológico (Post-Migración)

### Core

- **Framework**: Next.js 15.4.10 (App Router)
- **React**: 19.1.0
- **TypeScript**: ^5 (strict mode)
- **Runtime**: Node.js + Edge Runtime (Vercel)

### Backend & Database

- **BaaS**: Supabase (Postgres + Auth + Storage + Real-time)
- **ORM**: Supabase Client (no Prisma/Drizzle)
- **API**: Next.js Route Handlers (`/app/api/**`)

### Estado & Data Fetching

- **Estado Global**: Zustand con persist middleware
- **Server State**: TanStack Query (React Query) v5
- **Client State**: useState + useReducer cuando es local
- **Form State**: React Hook Form (futuro)

### Estilos

- **CSS Framework**: Tailwind CSS v4 con PostCSS
- **UI Library**: Custom components (sin shadcn/ui por ahora)
- **Icons**: Ninguna librería (usar emojis o SVGs inline)
- **Fonts**: Barlow (Google Fonts) - pesos 300, 500, 700

### Herramientas de Desarrollo

- **Linting**: ESLint 9 con eslint-config-next
- **Formatting**: Prettier con prettier-plugin-tailwindcss
- **Git Hooks**: Husky + lint-staged
- **Testing**: Vitest + Testing Library + Playwright
- **Type Generation**: Supabase CLI

### PWA & Analytics

- **PWA**: Service Worker custom + Web Manifest
- **Analytics**: Google Analytics 4 (gtag)
- **Monitoring**: Vercel Analytics (futuro: Sentry)

### Multi-tenancy

- **Tenant Resolution**: Next.js Middleware (subdomain-based)
- **Data Isolation**: Supabase Row-Level Security (RLS)
- **Feature Flags**: Custom DB-driven (tabla `feature_flags`)

---

## Estructura de Carpetas

```
almacen-front/
├── .claude/
│   └── instructions.md          # Este archivo
├── .husky/                      # Git hooks
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   └── *.png                    # PWA icons
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   │   ├── products/route.ts
│   │   │   └── health/supabase/route.ts
│   │   ├── layout.tsx           # Root layout con providers
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Global styles
│   ├── components/              # React components
│   │   ├── ui/                  # UI primitives
│   │   │   ├── QuantityButton.tsx
│   │   │   └── Button.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductList.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── stores/                  # Zustand stores
│   │   └── cartStore.ts
│   ├── hooks/                   # Custom React hooks
│   │   ├── useProducts.ts       # TanStack Query hook
│   │   ├── useFeatureFlag.ts
│   │   └── useTenant.ts
│   ├── data/                    # Data sources (repository pattern)
│   │   └── products/
│   │       ├── ProductDataSource.ts  # Interface
│   │       └── ApiProductDataSource.ts
│   ├── lib/                     # Third-party integrations
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser client
│   │   │   └── server.ts        # Server client
│   │   └── queryClient.ts       # TanStack Query config
│   ├── types/                   # TypeScript types
│   │   ├── index.ts             # Domain types
│   │   └── supabase.ts          # Generated from DB schema
│   ├── utils/                   # Utility functions
│   │   ├── productUtils.ts
│   │   ├── messageUtils.ts
│   │   └── analytics.ts
│   ├── config/                  # Configuration
│   │   ├── index.ts
│   │   └── instance.config.ts
│   └── constants/               # Constants
│       └── config.ts
├── tests/                       # Tests (Vitest + Playwright)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .env.local                   # Environment variables (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── .prettierrc.json
├── .eslintrc.json
└── README.md
```

---

## Convenciones de Código

### TypeScript

#### 1. Strict Mode Siempre

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

#### 2. Tipado Explícito en Funciones

```typescript
// ✅ CORRECTO
export function formatPrice(price: number): string {
  return `$${price.toLocaleString('es-AR')}`
}

// ❌ INCORRECTO (retorno implícito)
export function formatPrice(price: number) {
  return `$${price.toLocaleString('es-AR')}`
}
```

#### 3. Interfaces para Objetos, Types para Uniones

```typescript
// ✅ CORRECTO
interface Product {
  id: string
  name: string
  price: number
}

type ProductStatus = 'active' | 'inactive' | 'draft'

// ❌ INCORRECTO
type Product = {
  id: string
  name: string
}
```

#### 4. Usar Utility Types

```typescript
// ✅ CORRECTO
type ProductInput = Omit<Product, 'id' | 'createdAt'>
type PartialProduct = Partial<Product>

// ❌ INCORRECTO (duplicar propiedades)
interface ProductInput {
  name: string
  price: number
  // ... (no copiar todos los campos de Product)
}
```

#### 5. Generar Tipos desde Supabase

```bash
# Ejecutar cada vez que cambies el schema
npx supabase gen types typescript --project-id [ID] > src/types/supabase.ts
```

```typescript
// Uso
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
```

---

### React & Next.js

#### 1. Server Components por Defecto

```typescript
// ✅ CORRECTO - Server Component (default)
export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductList products={products} />
}

// Solo usar 'use client' cuando necesites:
// - useState, useEffect, hooks
// - Event handlers (onClick, onChange)
// - Browser APIs
```

#### 2. Nomenclatura de Componentes

```typescript
// ✅ CORRECTO
ProductCard.tsx       // Component file
useProducts.ts        // Hook file
cartStore.ts          // Store file
productUtils.ts       // Utils file

// ❌ INCORRECTO
product-card.tsx      // No kebab-case
ProductCardComponent.tsx  // No suffix "Component"
```

#### 3. Props con Interface, no Type

```typescript
// ✅ CORRECTO
interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  quantity?: number
}

export function ProductCard({ product, onAdd, quantity = 0 }: ProductCardProps) {
  // ...
}
```

#### 4. Destructuring Props

```typescript
// ✅ CORRECTO
export function ProductCard({ product, onAdd }: ProductCardProps) {
  return <div>{product.name}</div>
}

// ❌ INCORRECTO
export function ProductCard(props: ProductCardProps) {
  return <div>{props.product.name}</div>
}
```

#### 5. React.memo Solo Cuando Sea Necesario

```typescript
// ✅ CORRECTO - Componente renderiza frecuentemente
export const ProductCard = React.memo<ProductCardProps>(({ product }) => {
  return <div>{product.name}</div>
})
ProductCard.displayName = 'ProductCard'

// ❌ INCORRECTO - Optimización prematura
export const Header = React.memo(() => <header>Market</header>)
```

#### 6. Usar 'use client' Granularmente

```typescript
// ✅ CORRECTO - Solo el componente que necesita ser cliente
// components/AddToCartButton.tsx
'use client'

export function AddToCartButton({ product }: Props) {
  const addItem = useCartStore((state) => state.addItem)
  return <button onClick={() => addItem(product)}>Agregar</button>
}

// ProductCard.tsx (Server Component)
export function ProductCard({ product }: Props) {
  return (
    <div>
      <h3>{product.name}</h3>
      <AddToCartButton product={product} />
    </div>
  )
}
```

---

### Zustand Stores

#### Estructura de Store

```typescript
// stores/cartStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartState {
  items: CartItem[]
}

interface CartActions {
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

type CartStore = CartState & CartActions

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],

      // Actions
      addItem: (product, quantity) =>
        set((state) => ({
          items: [...state.items, { product, quantity }],
        })),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
      version: 1,
    }
  )
)

// Selectors (fuera del store para evitar re-renders)
export const selectTotalItems = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)

export const selectTotalPrice = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
```

#### Uso en Componentes

```typescript
// ✅ CORRECTO - Selectores específicos
function CartBadge() {
  const totalItems = useCartStore(selectTotalItems)
  return <span>{totalItems}</span>
}

// ❌ INCORRECTO - Subscribe a todo el store
function CartBadge() {
  const { items } = useCartStore()
  return <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
}
```

---

### TanStack Query

#### Configuración Global

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
})
```

#### Queries

```typescript
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query'
import { productDataSource } from '@/data/products'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productDataSource.getAll(),
  })
}

// Uso en componente
function ProductList() {
  const { data: products, isLoading, error, refetch } = useProducts()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} onRetry={refetch} />

  return <div>{products.map(/* ... */)}</div>
}
```

#### Mutations

```typescript
// hooks/useCreateOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: OrderInput) => createOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => {
      console.error('Failed to create order:', error)
    },
  })
}
```

#### Query Keys Consistentes

```typescript
// ✅ CORRECTO - Estructurados y tipados
export const queryKeys = {
  products: {
    all: ['products'] as const,
    detail: (id: string) => ['products', id] as const,
    byCategory: (category: string) => ['products', { category }] as const,
  },
  orders: {
    all: ['orders'] as const,
    detail: (id: string) => ['orders', id] as const,
  },
} as const

// Uso
useQuery({
  queryKey: queryKeys.products.byCategory('Pizzas'),
  queryFn: () => getProductsByCategory('Pizzas'),
})
```

---

### Supabase

#### Client vs Server

```typescript
// lib/supabase/client.ts - Para uso en Client Components
import { createBrowserClient } from '@supabase/ssr'

export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// lib/supabase/server.ts - Para uso en Server Components y API Routes
import { createClient } from '@supabase/supabase-js'

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### Queries Tipadas

```typescript
// ✅ CORRECTO
import type { Database } from '@/types/supabase'

const { data, error } = await supabase
  .from('products')
  .select('id, name, price, active')
  .eq('active', true)
  .order('id')

// data es tipo Product[] automáticamente
```

#### Error Handling

```typescript
// ✅ CORRECTO
const { data, error } = await supabase.from('products').select('*')

if (error) {
  console.error('Supabase error:', error.message, error.details)
  throw new Error(`Failed to fetch products: ${error.message}`)
}

// data es Product[] (no null)
return data
```

---

### Tailwind CSS

#### Convenciones

```typescript
// ✅ CORRECTO - Clases ordenadas (Prettier plugin lo hace automáticamente)
<div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-md">

// ❌ INCORRECTO - Clases desordenadas
<div className="p-4 bg-white shadow-md rounded-lg flex items-center justify-between">
```

#### No Usar Clases Arbitrarias en Exceso

```typescript
// ✅ CORRECTO - Valores del sistema
<div className="w-64 h-32 p-4 text-lg">

// ⚠️ USAR CON MODERACIÓN - Valores arbitrarios
<div className="w-[256px] h-[128px] p-[16px] text-[18px]">

// Solo usar [] cuando el valor no existe en Tailwind
<div className="grid-cols-[200px_1fr_100px]">
```

#### Extraer Componentes en Vez de Repetir Clases

```typescript
// ✅ CORRECTO
function Button({ children, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'rounded-lg px-4 py-2 font-medium transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  }

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  )
}

// ❌ INCORRECTO - Repetir clases en cada botón
<button className="rounded-lg px-4 py-2 bg-blue-600 text-white...">
```

---

### Testing

#### Unit Tests (Vitest)

```typescript
// tests/unit/productUtils.test.ts
import { describe, it, expect } from 'vitest'
import { formatPrice, getWeightType } from '@/utils/productUtils'

describe('productUtils', () => {
  describe('formatPrice', () => {
    it('formats price in Argentine pesos', () => {
      expect(formatPrice(1000)).toBe('$1.000')
      expect(formatPrice(1500.5)).toBe('$1.500,50')
    })

    it('handles zero price', () => {
      expect(formatPrice(0)).toBe('$0')
    })
  })

  describe('getWeightType', () => {
    it('returns "kg" for weight products', () => {
      const product = { name: 'Harina 1kg', /* ... */ }
      expect(getWeightType(product)).toBe('kg')
    })

    it('returns "unit" for unit products', () => {
      const product = { name: 'Pizza Muzzarella', /* ... */ }
      expect(getWeightType(product)).toBe('unit')
    })
  })
})
```

#### Component Tests (Testing Library)

```typescript
// tests/unit/ProductCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductCard } from '@/components/ProductCard'

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 100,
    image: 'https://example.com/image.jpg',
  }

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('$100')).toBeInTheDocument()
  })

  it('calls onAdd when add button is clicked', async () => {
    const onAdd = vi.fn()
    render(<ProductCard product={mockProduct} onAdd={onAdd} />)

    const addButton = screen.getByRole('button', { name: /agregar/i })
    await userEvent.click(addButton)

    expect(onAdd).toHaveBeenCalledWith(mockProduct, 1)
  })
})
```

#### E2E Tests (Playwright)

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Checkout flow', () => {
  test('user can add products to cart and send WhatsApp order', async ({ page }) => {
    await page.goto('/')

    // Search for a product
    await page.fill('[placeholder="Buscar productos..."]', 'Pizza')
    await page.waitForTimeout(500) // Debounce

    // Add product to cart
    await page.click('text=Agregar >> nth=0')

    // Open cart
    await page.click('[aria-label="Ver carrito"]')

    // Verify product in cart
    await expect(page.locator('text=Pizza')).toBeVisible()

    // Send WhatsApp order
    await page.click('text=Enviar pedido')

    // Verify WhatsApp opened
    await expect(page).toHaveURL(/wa.me/)
  })
})
```

---

### Multi-tenancy

#### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  let tenantId: string | null = null

  // Extract tenant from subdomain
  if (hostname.includes('.marketcevil.com')) {
    tenantId = hostname.split('.')[0]
  }

  if (!tenantId) {
    return NextResponse.redirect(new URL('/404', request.url))
  }

  // Inject tenant ID into headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenantId)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
```

#### Tenant Context

```typescript
// contexts/TenantContext.tsx
'use client'

import { createContext, useContext } from 'react'

interface TenantContextValue {
  tenantId: string
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
  children,
  tenantId,
}: {
  children: React.ReactNode
  tenantId: string
}) {
  return <TenantContext.Provider value={{ tenantId }}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
```

#### Supabase RLS

```sql
-- migrations/add_rls_to_products.sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only see their products
CREATE POLICY "Tenants can only see their products"
  ON products
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id')::uuid
  );

-- Policy: Tenants can only insert their products
CREATE POLICY "Tenants can only insert their products"
  ON products
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id')::uuid
  );
```

---

### Feature Flags

#### Hook

```typescript
// hooks/useFeatureFlag.ts
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/contexts/TenantContext'
import { supabaseClient } from '@/lib/supabase/client'

export function useFeatureFlag(flagKey: string): boolean {
  const { tenantId } = useTenant()

  const { data } = useQuery({
    queryKey: ['feature-flags', tenantId, flagKey],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('feature_flags')
        .select('enabled')
        .eq('tenant_id', tenantId)
        .eq('flag_key', flagKey)
        .single()

      if (error) throw error
      return data.enabled
    },
    staleTime: 10 * 60 * 1000, // Cache 10 min
  })

  return data ?? false
}
```

#### Uso

```typescript
// components/ProductCard.tsx
function ProductCard({ product }: Props) {
  const stockEnabled = useFeatureFlag('stock')

  return (
    <div>
      <h3>{product.name}</h3>
      {stockEnabled && <p>Stock: {product.stock}</p>}
    </div>
  )
}
```

---

## Patrones Comunes

### Error Handling

```typescript
// ✅ CORRECTO - Componente de error reutilizable
interface ErrorMessageProps {
  error: Error
  onRetry?: () => void
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-lg bg-red-50 p-4 text-red-800">
      <p className="font-medium">Error</p>
      <p className="text-sm">{error.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
```

### Loading States

```typescript
// ✅ CORRECTO - Skeleton loading
export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg bg-gray-200 p-4">
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
      <div className="h-4 w-1/2 rounded bg-gray-300"></div>
    </div>
  )
}

// Uso
function ProductList() {
  const { data: products, isLoading } = useProducts()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return <div>{/* render products */}</div>
}
```

### Debouncing

```typescript
// ✅ CORRECTO - Hook de debounce
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Uso
function SearchInput() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    // Fetch products with debouncedSearch
  }, [debouncedSearch])

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />
}
```

---

## Variables de Entorno

### Nomenclatura

```bash
# .env.local

# Public (expuesto al cliente)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_WHATSAPP_NUMBER=5493816713512

# Private (solo servidor)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DATABASE_URL=postgresql://...
```

### Uso

```typescript
// ✅ CORRECTO - Validar en startup
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
} as const
```

---

## Comandos Comunes

### Desarrollo

```bash
# Iniciar dev server con Turbopack
npm run dev

# Build para producción
npm run build

# Iniciar servidor de producción
npm start

# Linting
npm run lint

# Formatear código
npx prettier --write .

# Type check
npx tsc --noEmit
```

### Testing

```bash
# Run unit tests
npx vitest

# Run unit tests con coverage
npx vitest --coverage

# Run E2E tests
npx playwright test

# Run E2E tests en modo UI
npx playwright test --ui
```

### Supabase

```bash
# Generar tipos desde DB
npx supabase gen types typescript --project-id [ID] > src/types/supabase.ts

# Iniciar Supabase localmente
npx supabase start

# Crear migration
npx supabase migration new [name]

# Aplicar migrations
npx supabase db push
```

### Git Hooks

```bash
# Preparar Husky
npx husky init

# Pre-commit hook (ya configurado)
# - Prettier format
# - ESLint fix
# - Type check
```

---

## Reglas de Commits

### Conventional Commits

```bash
# Formato
<type>(<scope>): <description>

# Tipos
feat: Nueva funcionalidad
fix: Bug fix
refactor: Refactorización sin cambio de comportamiento
chore: Cambios en build, deps, etc.
docs: Documentación
style: Formateo, missing semicolons, etc.
test: Agregar/actualizar tests
perf: Mejora de performance

# Ejemplos
feat(cart): add cart persistence with localStorage
fix(products): handle error when Supabase is down
refactor(components): consolidate ProductCard variants
chore(deps): update Next.js to 15.4.10
```

---

## Guía de Troubleshooting

### Error: "Hydration failed"

**Causa**: Server y cliente renderizan HTML diferente

**Solución**:
```typescript
// ✅ CORRECTO - Usar useEffect para valores que cambian
function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <div>{localStorage.getItem('value')}</div>
}
```

### Error: "Cannot read property of undefined" en Supabase

**Causa**: Tipos generados no coinciden con DB

**Solución**:
```bash
# Re-generar tipos
npx supabase gen types typescript --project-id [ID] > src/types/supabase.ts
```

### Zustand no persiste en localStorage

**Causa**: SSR conflicto con persist middleware

**Solución**:
```typescript
// ✅ CORRECTO - Hidratar en cliente
const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      // ...
    }),
    {
      name: 'cart-storage',
      skipHydration: true, // ⬅️ Importante
    }
  )
)

// En _app.tsx o layout.tsx
useEffect(() => {
  useCartStore.persist.rehydrate()
}, [])
```

---

## Recursos

### Documentación Oficial

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://docs.pmnd.rs/zustand/
- **TanStack Query**: https://tanstack.com/query/latest
- **Supabase**: https://supabase.com/docs
- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/

### Herramientas

- **Supabase Studio**: https://app.supabase.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **React Query DevTools**: Incluido en el proyecto
- **Zustand DevTools**: https://github.com/pmndrs/zustand#devtools

---

## Notas Finales

### Principios de Diseño

1. **Simplicidad sobre Complejidad**: No agregar abstracciones hasta que sean necesarias
2. **Type Safety First**: Priorizar TypeScript end-to-end
3. **User Experience**: Loading states, error handling, y feedback son críticos
4. **Performance Matters**: Pero no optimizar prematuramente
5. **Consistencia**: Seguir convenciones establecidas

### Cuándo Refactorizar

- Código duplicado 3+ veces → Extraer función/componente
- Componente > 300 líneas → Dividir en subcomponentes
- Props > 7 → Considerar Context o Zustand
- useEffect con muchas dependencias → Dividir en múltiples effects

### Cuándo NO Refactorizar

- "Para hacer el código más bonito" sin beneficio claro
- Optimización sin profiling primero
- Cambiar tecnología sin razón justificada
- Abstracciones "por si acaso"

---

**Última actualización**: 2026-01-26
**Autor**: Claude Code (con supervisión humana)
**Versión**: 1.0.0
