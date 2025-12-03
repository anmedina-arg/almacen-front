# Plan de migración a Zustand (implementación concreta)

Objetivo
- Reducir prop-drilling y rerenders innecesarios.
- Mover estado UI cliente (carrito, búsqueda, vista lista/cuadrícula, subcategorías expandidas) a una store central con Zustand.
- Mantener la posibilidad de maximizar SSR para listados pesados: datos de productos siguen en server; UI interactiva en cliente via Zustand.

Resumen de pasos
1. Instalar dependencias.
2. Crear store central (src/stores/useAppStore.ts).
3. Migrar estado incrementalmente (primero carrito y búsqueda, luego expandedSubcategories, showList).
4. Reescribir componentes para usar selectores (minimizar rerenders).
5. Añadir persistencia (opcional) y devtools (opcional).
6. Probar y perfilar (debug re-renders, usar memo donde haga falta).

Comandos
- Instalar Zustand:
  - npm install zustand
  - opcional (persist + devtools): npm install zustand zustand/middleware

Estrategia de migración (fases)
- Fase 0 — Preparación
  - Crear archivo de store base.
  - Añadir tipos y acciones mínimas.

- Fase 1 — Carrito
  - Migrar lógica del carrito (addToCart, removeFromCart, getItemQuantity, items) desde useCart o props a Zustand.
  - Reemplazar useCart en componentes por selectores de la store.
  - Verificar que los componentes que no dependen del carrito no se rerenderizan.

- Fase 2 — Búsqueda
  - Mover search y debouncedSearch a la store o mantener input controlado localmente y setear search en la store (preferible).
  - ProductListContainer lee resultados usando selector (products filtrados) o sigue pasando products desde server y usa search en ProductList.

- Fase 3 — UI local
  - Migrar expandedSubcategories, showList y filtros seleccionados a la store.
  - Hacer que ProductList y FilterButtons usen selectores/acciones en la store.

- Fase 4 — Optimización y persistencia
  - Añadir persistencia (localStorage) solo si se desea mantener carrito entre sesiones.
  - Añadir devtools en desarrollo.
  - Revisar selectores y usar shallow o equality para evitar rerenders.

Store ejemplo (inicial)
- Crear el archivo de store con acciones y selectores recomendados.

```typescript
// filepath: c:\Users\cabez\OneDrive\Escritorio\PROYECTOS\almacen-front\src\stores\useAppStore.ts
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Product } from '@/types';

type CartItem = { id: number; qty: number };

type AppState = {
  // carrito
  cart: CartItem[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: number) => void;
  getQuantity: (id: number) => number;

  // UI
  search: string;
  setSearch: (q: string) => void;

  showList: 'list' | 'grid';
  setShowList: (v: 'list' | 'grid') => void;

  expanded: Record<string, boolean>; // keys: `${main}-${sub}`
  toggleExpanded: (key: string) => void;
  openKeys: (keys: string[]) => void;
  resetExpanded: () => void;
};

export const useAppStore = create<AppState>()(
  devtools(
    persist((set, get) => ({
      cart: [],
      addToCart: (p: Product) => set((s) => {
        const idx = s.cart.findIndex(i => i.id === p.id);
        if (idx >= 0) {
          const cart = [...s.cart];
          cart[idx] = { ...cart[idx], qty: cart[idx].qty + 1 };
          return { cart };
        }
        return { cart: [...s.cart, { id: p.id, qty: 1 }] };
      }),
      removeFromCart: (id: number) => set((s) => ({ cart: s.cart.filter(i => i.id !== id) })),
      getQuantity: (id: number) => {
        const it = get().cart.find(i => i.id === id);
        return it ? it.qty : 0;
      },

      search: '',
      setSearch: (q) => set({ search: q }),

      showList: 'list',
      setShowList: (v) => set({ showList: v }),

      expanded: {},
      toggleExpanded: (key) => set((s) => ({ expanded: { ...s.expanded, [key]: !s.expanded[key] } })),
      openKeys: (keys) => set((s) => {
        const next = { ...s.expanded };
        keys.forEach(k => { next[k] = true; });
        return { expanded: next };
      }),
      resetExpanded: () => set({ expanded: {} }),
    }), {
      name: 'app-storage', // localStorage key
      // black/white list if needed
    })
  )
);
```

Cómo usar la store en componentes (ejemplos)
- ProductListContainer (leer search y setSearch)

```tsx
// filepath: c:\Users\cabez\OneDrive\Escritorio\PROYECTOS\almacen-front\src\components\ProductListContainer.tsx
import { useAppStore } from '@/stores/useAppStore';
const search = useAppStore(state => state.search);
const setSearch = useAppStore(state => state.setSearch);
const addToCart = useAppStore(state => state.addToCart);
const getQuantity = useAppStore(state => state.getQuantity);
```

- ProductList (expanded control)

```tsx
// filepath: c:\Users\cabez\OneDrive\Escritorio\PROYECTOS\almacen-front\src\components\ProductList.tsx
const isExpanded = useAppStore(state => state.expanded[key]);
const toggle = useAppStore(state => state.toggleExpanded);
```

Good practices (minimizar rerenders)
- Seleccionar solo lo necesario: useAppStore(s => s.cart.length) o useAppStore(s => s.cart.find(...)) evita renderear todo.
- Usar funciones de selector memoizadas y shallow compare si es necesario.
- Mantener componentes puros: pasar las funciones de la store (acciones) directamente como handlers sin re-declararlas.
- React.memo en cards que reciben solo datos inmutables.

SSR / Next.js considerations
- Zustand es cliente: Server Components no pueden leer la store en servidor.
- Patrón recomendado:
  - Mantener datos de productos (fetch) y renderizado principal en Server Components.
  - Inyectar pequeñas Client Components que usen Zustand para UI interactiva (botones, carrito, buscador).
  - Si la búsqueda debe ser SSR, usar query params y re-render server-side; si es client-side, mantener en Zustand y filtrar en cliente.

Checklist de migración (tareas concretas)
1. Crear `src/stores/useAppStore.ts` con la implementación base.
2. Reemplazar addToCart/getQuantity/removeFromCart en `useCart` o eliminar `useCart` y refactorizar componentes pequeños a usar `useAppStore`.
3. Cambiar ProductListContainer:
   - El input `search` setea `setSearch` en store.
   - Mantener debouncedSearch local o mover debounce a la store (preferible local).
4. Cambiar ProductList:
   - Leer expanded keys y toggle desde store.
   - El componente solo recibe `products` (filtrados) y `mainCategories`.
   - Cuando search no vacío, calcular keysToOpen y llamar `openKeys(keys)` en la store (en lugar de setState local).
5. Revisar FilterButtons para leer mainCategories desde store o recibirlas como prop.
6. Tests manuales: añadir producto, buscar, expandir subcategoría, confirmar que la UI no se cierra.
7. Performance: usar React Profiler/devtools para verificar rerenders.

Rollback
- Mantener commits por fases (PR por fase).
- Si hay fallback, volver a `useCart` y revertir imports.

Notas finales
- Migración incremental reduce riesgos: empezar por carrito y búsqueda.
- Zustand mejora la legibilidad y reduce prop-drilling; pero no sustituye la separación de responsabilidades entre Server/Client.
- Puedo generar el archivo de store y los cambios mínimos en ProductListContainer/ProductList si quieres que los aplique ahora.
