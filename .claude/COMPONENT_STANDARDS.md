# Component Standards — Market Cevil (Next.js 15 + React 19)

This document defines the single authoritative standard for every component in this codebase.
Every rule has a technical justification. Follow these rules exactly; do not mix styles.

---

## 1. Component Declaration Form

### Standard: `function` declaration (not `const` arrow)

```tsx
// CORRECT
export function MyComponent({ label }: MyComponentProps) {
  return <span>{label}</span>;
}

// WRONG — arrow + const
export const MyComponent = ({ label }: MyComponentProps) => {
  return <span>{label}</span>;
};
```

### Why
- **Hoisting**: `function` declarations are hoisted; `const` arrows are not. In practice this rarely matters inside modules, but it eliminates a class of edge-case bugs with circular references.
- **Stack traces**: Named function declarations produce cleaner stack traces and React DevTools labels without needing `displayName`.
- **Consistency with Next.js conventions**: Every App Router page, layout, and route handler in the framework's own docs uses `function` declarations (`export default function Page()`). Matching that pattern makes the codebase easier to read and onboard.
- **No `React.FC` needed**: `function` declarations with typed props are the TypeScript team's recommended form — `React.FC` has been deprecated from usage in practice since it adds nothing (`React.FC` was removed from `create-react-app` default templates in 2022).

### Rule for `default` vs named export pages/layouts
App Router pages and layouts MUST use `export default function` (named, not anonymous). Next.js requires a default export; adding the function name makes stack traces and DevTools useful:

```tsx
// CORRECT
export default function LoginPage() { ... }

// WRONG — anonymous
export default function() { ... }
```

---

## 2. Prop Typing

### Standard: Separate `interface` defined above the component, named `[ComponentName]Props`

```tsx
// CORRECT — interface above, named, explicit
interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
}

function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  ...
}
```

```tsx
// WRONG — inline type annotation in function signature
function ProductCard({ product, quantity }: { product: Product; quantity: number }) {
  ...
}

// WRONG — React.FC<Props>
const ProductCard: React.FC<ProductCardProps> = ({ product }) => { ... };
```

### Why
- **Separate interface**: Makes the contract of a component immediately visible without reading the full signature. Enables `extends` for composition and works better with IDE tooling (hover, go-to-definition).
- **Interface over type for public contracts**: TypeScript's own style guide and most large-scale TypeScript projects use `interface` for object shapes that represent component APIs. `type` is reserved for unions, intersections, and mapped/conditional types.
- **No `React.FC`**: `React.FC` implicitly adds `children` to props (in React 18 this was removed, but the pattern still causes confusion), wraps the return type in `JSX.Element | null` unnecessarily, and provides no benefit over a plain typed function. The React and TypeScript teams both recommend against it.
- **Props type for internal-only/complex shapes**: Use `type` only when using union types or mapped types. Example: `type ViewMode = 'list' | 'grid';`

### Exception — components without props
Components that take no props do not need an explicit props interface:

```tsx
// CORRECT — no interface needed
export function Footer() {
  return <footer>...</footer>;
}
```

---

## 3. `'use client'` Directive

### Standard: Add `'use client'` only when the component directly uses browser APIs or React hooks that require the client

#### Client Component indicators (must have `'use client'`):
- Uses `useState`, `useEffect`, `useReducer`, `useRef`, `useCallback`, `useMemo`, `useContext`
- Uses any hook from a library that reads browser state (`useRouter`, `usePathname`, `useQuery`, `useIsAuthenticated`, etc.)
- Attaches DOM event listeners (`onClick`, `onChange`, `onSubmit`, etc.) that depend on component state
- Uses browser-only globals (`window`, `document`, `localStorage`, `navigator`)

#### Server Component indicators (must NOT have `'use client'`):
- Is a page/layout in the App Router that fetches data server-side
- Renders purely static JSX — even if it has event handlers on intrinsic elements — as long as it imports no hooks or browser APIs
- Imports and renders only other Server Components or Client Components (Client Components can be rendered inside Server Components)

### Why
- **Bundle size**: Every `'use client'` boundary adds that component's subtree to the JavaScript bundle sent to the browser. Unnecessary `'use client'` markers bloat the client bundle and eliminate RSC streaming benefits.
- **`Footer` case study**: `Footer` has no hooks, no state, no browser APIs. It read `process.env.NEXT_PUBLIC_*` (which is available at build time server-side) and rendered static JSX. It should be a Server Component — no `'use client'`.
- **React 19 context**: React 19 introduces compiler-level optimizations for Server Components. Adding `'use client'` incorrectly opts components out of these optimizations.

### Special case — wrapper/provider components
`Providers.tsx` must be `'use client'` because `QueryClientProvider` and `AuthProvider` use context internally. This is correct and intentional.

---

## 4. Export Style

### Standard: Named exports for feature components; `export default function` for pages and layouts

```tsx
// CORRECT — named export for a feature component
export function AdminProductCard({ product, onEdit }: AdminProductCardProps) { ... }

// CORRECT — default export for a Next.js page or layout
export default function AdminProductsPage() {
  return <AdminProductList />;
}

// WRONG — mixing default and named in the same feature component file
const AdminProductCard = () => { ... };
export default AdminProductCard; // default is not needed here
```

### Why
- **Named exports are refactor-safe**: Renaming a named export triggers a TypeScript error at every import site. Default exports allow silent name mismatches: `import Foo from './Bar'` compiles fine even if the component is really `Bar`.
- **Tree-shaking**: Named exports are more reliable for bundlers to tree-shake, though in practice Next.js handles this well either way.
- **Pages and layouts**: Next.js App Router requires a default export. Pages and layouts are entry points, not reusable components, so the default export convention is appropriate and required.
- **Current codebase split**: The admin and auth features consistently use named exports (`export function AdminNav`, `export function LoginForm`). The catalog and shared components inconsistently mix default exports with `const` arrows. This standard unifies them.

### Corollary: no `export default` for feature/UI components
Feature components should never use `export default` because they live inside barrel-less feature folders and are imported directly by path. Named exports make refactoring safer.

---

## 5. `React.memo`

### Standard: Do NOT use `React.memo` unless a specific, measured performance problem justifies it

```tsx
// WRONG — wrapping without justification
const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, quantity }) => {
  ...
});

// CORRECT — plain function, no memo
function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  ...
}
```

### Why (React 19 context)
- **React 19 compiler**: React 19 ships with an optional compiler (React Compiler, previously "React Forget") that automatically memoizes components and values. When the compiler is active, manual `React.memo` is redundant and adds noise.
- **`React.memo` cost**: Memoization is not free. React still needs to compare prev and next props on every parent re-render using shallow equality. For complex prop objects (products with nested arrays), this comparison may cost more than a simple re-render.
- **Context in this app**: `ProductCard` and `ProductSquareCard` receive `product` (an object) and callbacks `onAdd`/`onRemove`. The parent `ProductListContainer` wraps `onAdd` and `onRemove` in `useCallback` and computes `productsWithQuantity` via `useMemo`. In this setup, `React.memo` on the cards will indeed skip re-renders when those inputs are stable — which is the correct and intentional use. **These two specific cases are justified** and should keep `React.memo`.
- **Rule of thumb**: Only add `React.memo` when (a) the component is confirmed to re-render unnecessarily via React DevTools Profiler and (b) the re-render is measurably expensive. Remove it if neither condition is met.

### `displayName` requirement
Any component wrapped in `React.memo` MUST set `displayName`:

```tsx
ProductCard.displayName = 'ProductCard';
```

This ensures React DevTools shows the component name instead of `memo(Component)`. When using `function` declarations (the standard in this file), the function name is automatically available, but `displayName` should still be set explicitly after `React.memo` wrapping.

---

## 6. Import Order

### Standard: Follow this order, separated by a blank line

1. React (only if types or specific React APIs are needed — not `import React from 'react'` for JSX in React 17+)
2. Next.js (`next/navigation`, `next/image`, `next/link`, etc.)
3. Third-party libraries (`@tanstack/react-query`, `zustand`, etc.)
4. Internal absolute imports (`@/features/...`, `@/components/...`, `@/lib/...`)
5. Relative imports (`./MyComponent`, `../types`)
6. Type-only imports (`import type { ... }`)

```tsx
// CORRECT
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/features/auth/stores/authStore';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';
```

### Why
- Consistent import ordering makes diffs smaller and reviews faster.
- Type-only imports (`import type`) are a TypeScript best practice — they guarantee the import is erased at compile time and prevent circular dependency issues in large codebases.

---

## 7. `React` Namespace Import

### Standard: Do NOT import `React` for JSX. Do import specific APIs by name when needed.

```tsx
// WRONG — unnecessary default React import
import React from 'react';
import React, { useState } from 'react';

// CORRECT — import only what you use
import { useState, useEffect, useCallback } from 'react';
```

### Why
- Since React 17, the JSX transform is automatic — `import React from 'react'` is no longer required for JSX to compile.
- Importing the full `React` namespace for use as `React.FC`, `React.memo`, `React.FormEvent` etc. is discouraged: use named imports (`FC` is avoided per rule 2; `memo` is avoided per rule 5; use `React.FormEvent` → import `{ type FormEvent } from 'react'`).
- Exception: `React.ReactNode` used as a type can stay as `import type { ReactNode } from 'react'`.

---

## 8. Quick-Reference Audit Checklist

| Check | Correct | Wrong examples found |
|---|---|---|
| Declaration form | `function Foo(...)` | `const Foo = () =>`, `const Foo: React.FC =` |
| Props typing | `interface FooProps {}` above component | inline type in signature, no interface |
| `React.FC` | Never use | `const Foo: React.FC<Props> = ...` |
| `'use client'` | Only when hooks/browser APIs used | Missing on `HelpButton`; present-but-fine on `Footer` was caught |
| Export | Named for components, default for pages | Default export on `Header`, `Footer`, `ProductCard`, etc. |
| `React.memo` | Only `ProductCard`, `ProductSquareCard` (justified) | All other components should not use it |
| `import React` | Never import for JSX | `import React from 'react'` in several files |
| `displayName` | Required when `React.memo` is used | `ProductCard.displayName` ✓, `ProductSquareCard.displayName` ✓ |

---

## 9. Before/After Examples

### Component declaration + props typing

```tsx
// BEFORE (found in codebase)
import React from 'react';

const Footer: React.FC = () => {
  return <footer>...</footer>;
};

export default Footer;

// AFTER (standard)
export function Footer() {
  return <footer>...</footer>;
}
```

```tsx
// BEFORE (found in codebase)
const Header = () => { ... };
export default Header;

// AFTER (standard)
'use client';

export function Header() { ... }
```

```tsx
// BEFORE (found in codebase)
const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, quantity, onAdd, onRemove }) => {
  ...
});
ProductCard.displayName = 'ProductCard';
export default ProductCard;

// AFTER (standard — keep memo because justified, fix form)
function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  ...
}

export default ProductCard; // NOTE: page-level default retained here only
                            // Feature components switch to named exports
```

---

## 10. Files Exempt from Export-Style Rule

The following files are Next.js entry points and MUST use `export default`. They already comply:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/stock/page.tsx`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`

Shared `src/components/` files that are imported into the layout as singletons (`InstallPWAButton`, `GoogleAnalytics`, `PWAInstallTracker`) currently use `export default`. These are kept as `export default` because they are imported in `layout.tsx` as default imports, and changing them would require updating both the export and the import simultaneously — acceptable, but deferred since it carries zero runtime benefit.

**Decision**: Convert `src/components/` files to named exports in this refactor, updating the imports in `layout.tsx` and `page.tsx` accordingly, for consistency.
