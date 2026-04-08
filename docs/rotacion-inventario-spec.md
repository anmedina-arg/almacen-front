# Spec — Feature: Rotación de Inventario

## Contexto

Esta feature calcula y muestra el índice de rotación de cada producto activo en `/admin/dashboard`.
Hubo una implementación previa que fue descartada por ser frágil y compleja. Esta spec define
la arquitectura correcta desde cero.

**No reutilices ni adaptes la implementación anterior. Reemplazala completamente.**

---

## Archivos involucrados

| Archivo | Acción |
|---|---|
| `supabase/migrations/YYYYMMDD_rotation_avg_stock.sql` | Crear — función RPC PostgreSQL |
| `src/app/api/dashboard/rotation/route.ts` | Reemplazar — API Route |
| `src/features/admin/services/dashboardService.ts` | Modificar — agregar `getRotation()` |
| `src/features/admin/constants/queryKeys.ts` | Modificar — agregar `dashboardRotation(days)` |
| `src/features/admin/hooks/useInventoryRotation.ts` | Reemplazar — hook TanStack Query |
| `src/features/admin/components/dashboard/InventoryRotationTable.tsx` | Reemplazar — componente UI |

---

## Fórmula

```
rotación = unidades_vendidas / stock_promedio
```

### Unidades vendidas (`units_sold`)

- Fuente: tabla `order_items` con join `!inner` a `orders`
- Filtros:
  - `orders.status IN ('pending', 'confirmed')`
  - `orders.created_at >= startDate`
- La columna `quantity` en `order_items` está en **gramos** para productos tipo `kg` y `100gr`,
  y en **unidades enteras** para tipo `unit`
- Agregar siempre `.limit(10000)` para no depender del default de PostgREST

### Stock promedio (`avg_stock`)

**Método: promedio aritmético de snapshots diarios.**

Para cada día D en la ventana `[startDate, endDate]`:

```
snapshot(D) = new_qty del último movimiento en stock_movement_log
              con created_at <= D para ese product_id
```

Si no hay ningún movimiento hasta el día D → el producto no tiene stock conocido ese día
→ excluir ese día del promedio (no contar como 0).

```
avg_stock = SUM(snapshot(D) para cada D con valor conocido) / COUNT(días con valor conocido)
```

**Ejemplo con ventana de 7 días:**

```
Historial de movimientos del producto:
  hoy - 10:  new_qty = 20  (compra)
  hoy - 4:   new_qty = 14  (venta)

Snapshots:
  hoy - 7:  20  (hereda hoy-10, último movimiento conocido)
  hoy - 6:  20
  hoy - 5:  20
  hoy - 4:  14  (movimiento ese día)
  hoy - 3:  14
  hoy - 2:  14
  hoy - 1:  14

avg_stock = (20+20+20+14+14+14+14) / 7 = 16.57
```

**Snapshot de hoy:** usar `product_stock.quantity` directamente — no buscar en `stock_movement_log`
para el día actual, ya que `product_stock` es la fuente de verdad del stock vigente.

---

## Arquitectura

### Por qué una RPC en PostgreSQL

El cálculo del avg_stock requiere buscar, para cada producto, el último movimiento antes
de cada día de la ventana. Hacer esto desde el cliente (API Route) implicaría:

- Traer grandes volúmenes de filas de `stock_movement_log`
- Quedar expuesto al límite `db-max-rows` de PostgREST (actualmente 1000 filas)
- Lógica compleja en TypeScript que es frágil ante edge cases

La solución es una **función RPC en PostgreSQL** que realiza todo el cálculo server-side
y retorna solo una fila por producto: `(product_id, avg_stock)`.

### Flujo general

```
GET /api/dashboard/rotation?days=N
  │
  ├── Query ventas (order_items + !inner join orders)    → TypeScript/PostgREST
  │
  ├── RPC: get_avg_stock_per_product(start_date, end_date) → PostgreSQL
  │
  └── Combinar resultados → calcular rotación → retornar array
```

---

## FASE 1 — Función RPC en PostgreSQL

Crear el archivo de migración en `supabase/migrations/` con la siguiente función:

```sql
CREATE OR REPLACE FUNCTION get_avg_stock_per_product(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS TABLE (
  product_id  INT,
  avg_stock   NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day        DATE;
  v_days_count INT;
BEGIN
  -- Tabla temporal para acumular snapshots por producto por día
  CREATE TEMP TABLE IF NOT EXISTS _snapshots (
    product_id INT,
    day_date   DATE,
    qty        NUMERIC
  ) ON COMMIT DROP;

  -- Iterar cada día de la ventana
  v_day := p_start_date;
  WHILE v_day <= p_end_date LOOP

    -- Para hoy: usar product_stock como fuente de verdad
    IF v_day = CURRENT_DATE THEN
      INSERT INTO _snapshots (product_id, day_date, qty)
      SELECT ps.product_id, v_day, ps.quantity
      FROM product_stock ps
      JOIN products p ON p.id = ps.product_id
      WHERE p.is_active = true;  -- ajustar nombre de columna si difiere

    -- Para días anteriores: último movimiento conocido hasta ese día
    ELSE
      INSERT INTO _snapshots (product_id, day_date, qty)
      SELECT DISTINCT ON (sml.product_id)
        sml.product_id,
        v_day,
        sml.new_qty
      FROM stock_movement_log sml
      JOIN products p ON p.id = sml.product_id
      WHERE p.is_active = true
        AND sml.created_at::DATE <= v_day
      ORDER BY sml.product_id, sml.created_at DESC;
    END IF;

    v_day := v_day + INTERVAL '1 day';
  END LOOP;

  -- Retornar promedio por producto (solo días con valor conocido)
  RETURN QUERY
  SELECT
    s.product_id,
    AVG(s.qty)::NUMERIC AS avg_stock
  FROM _snapshots s
  GROUP BY s.product_id;

END;
$$;
```

**Notas importantes sobre la RPC:**

- Verificar el nombre exacto de la columna que indica si un producto está activo
  (`is_active`, `status = 'active'`, u otro). Buscarlo en la definición de la tabla `products`
  antes de escribir la función.
- Verificar que `product_stock.product_id` y `stock_movement_log.product_id` son del mismo tipo
  que `products.id`.
- La tabla temporal `_snapshots` usa `ON COMMIT DROP` — es segura para llamadas concurrentes.
- `DISTINCT ON (product_id)` con `ORDER BY product_id, created_at DESC` es la forma eficiente
  en PostgreSQL de obtener "el último registro por grupo" sin subconsultas costosas.

Después de crear la migración, ejecutarla con:

```bash
supabase db push
# o según el flujo del proyecto:
supabase migration up
```

---

## FASE 2 — API Route

Archivo: `src/app/api/dashboard/rotation/route.ts`

**Reemplazar completamente el contenido existente.**

```ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30', 10)

  const supabase = createClient()

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const startIso = startDate.toISOString()
  const startDateStr = startDate.toISOString().split('T')[0]   // 'YYYY-MM-DD'
  const endDateStr = endDate.toISOString().split('T')[0]

  // 1. Ventas por producto en el período
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select('product_id, quantity, orders!inner(status, created_at)')
    .filter('orders.status', 'in', '("pending","confirmed")')
    .gte('orders.created_at', startIso)
    .limit(10000)

  if (salesError) {
    return NextResponse.json({ error: salesError.message }, { status: 500 })
  }

  // Agrupar ventas por product_id
  const salesByProduct: Record<number, number> = {}
  for (const item of salesData ?? []) {
    const pid = item.product_id
    salesByProduct[pid] = (salesByProduct[pid] ?? 0) + item.quantity
  }

  // 2. Stock promedio por producto via RPC
  const { data: stockData, error: stockError } = await supabase
    .rpc('get_avg_stock_per_product', {
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    })

  if (stockError) {
    return NextResponse.json({ error: stockError.message }, { status: 500 })
  }

  const avgStockByProduct: Record<number, number> = {}
  for (const row of stockData ?? []) {
    avgStockByProduct[row.product_id] = parseFloat(row.avg_stock)
  }

  // 3. Obtener lista de productos activos con nombre y categoría
  // Usar la RPC existente get_all_products_with_stock() o la query que ya existe en el proyecto
  const { data: products, error: productsError } = await supabase
    .rpc('get_all_products_with_stock')

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 })
  }

  // 4. Combinar y calcular rotación
  const result = (products ?? [])
    .filter((p: any) => p.is_active)  // ajustar según el campo real
    .map((p: any, index: number) => {
      const unitsSold = salesByProduct[p.id] ?? 0
      const avgStock = avgStockByProduct[p.id] ?? 0
      const rotation = avgStock > 0 ? unitsSold / avgStock : null

      return {
        index: index + 1,
        product_id: p.id,
        name: p.name,
        category: p.category ?? p.category_name ?? null,
        units_sold: unitsSold,
        avg_stock: avgStock,
        rotation: rotation !== null ? parseFloat(rotation.toFixed(2)) : null,
      }
    })
    .sort((a: any, b: any) => (b.rotation ?? -1) - (a.rotation ?? -1))

  return NextResponse.json(result)
}
```

**Notas para adaptar:**

- El paso 3 usa `get_all_products_with_stock()` porque ya existe en el proyecto y retorna
  productos con stock. Verificar los nombres exactos de los campos que retorna
  (`is_active`, `category_name`, etc.) antes de escribir el map.
- Si `get_all_products_with_stock()` no retorna el campo de categoría, hacer una query
  separada a `products` con join a la tabla de categorías correspondiente.
- No cambiar el cliente Supabase ni el patrón de imports — usar el mismo que usan las otras
  routes del proyecto.

---

## FASE 3 — Servicios, hook y UI

### queryKeys.ts

Agregar dentro del objeto `adminKeys` existente:

```ts
dashboardRotation: (days: number) => [...adminKeys.all, 'dashboard', 'rotation', days] as const,
```

### dashboardService.ts

Agregar la función `getRotation`:

```ts
export interface RotationItem {
  index: number
  product_id: number
  name: string
  category: string | null
  units_sold: number
  avg_stock: number
  rotation: number | null
}

export async function getRotation(days: number): Promise<RotationItem[]> {
  const res = await fetch(`/api/dashboard/rotation?days=${days}`)
  if (!res.ok) throw new Error('Error al obtener rotación')
  return res.json()
}
```

### useInventoryRotation.ts

**Reemplazar completamente.**

```ts
import { useQuery } from '@tanstack/react-query'
import { getRotation, RotationItem } from '../services/dashboardService'
import { adminKeys } from '../constants/queryKeys'

export function useInventoryRotation(days: number = 30) {
  return useQuery<RotationItem[]>({
    queryKey: adminKeys.dashboardRotation(days),
    queryFn: () => getRotation(days),
  })
}
```

### InventoryRotationTable.tsx

**Reemplazar completamente.**

Requisitos del componente:

- **Selector de período:** botones para 7 / 15 / 30 / 60 / 90 días. El período activo debe
  tener estilo diferenciado. Estado local con `useState`, default 30.
- **Tabla** con columnas: `#` · `Producto` · `Categoría` · `Ventas` · `Stock prom.` · `Rotación` · `Nivel`
- **Badge "Nivel":**
  - Alta  → `rotation >= 1`
  - Media → `rotation >= 0.3`
  - Baja  → `rotation < 0.3`
  - Sin dato → mostrar `—` si `rotation === null`
- **Exportar CSV:** botón en el encabezado de la tabla. El CSV debe:
  - Incluir BOM (`\uFEFF`) al inicio para compatibilidad con Excel en español
  - Incluir encabezados en español
  - Separador: `,`
  - Nombre del archivo: `rotacion-${days}d-${fecha}.csv`
- **Estado de carga:** skeleton de filas mientras `isLoading === true`
- **Estado de error:** mensaje visible si `isError === true`
- Usar el mismo sistema de estilos (Tailwind / shadcn / lo que usa el resto del proyecto)

---

## Consideraciones de escala

A medida que crezca `stock_movement_log`, la RPC puede volverse lenta para ventanas largas
porque itera día por día con un `DISTINCT ON` por iteración.

Si en el futuro la query supera 2-3 segundos, las opciones son:

1. **Agregar índice compuesto** en `stock_movement_log(product_id, created_at DESC)`
   si no existe todavía.
2. **Tabla de snapshots diarios materializada** — pre-calcular el stock al cierre de cada día
   mediante un cron job, eliminando la necesidad de reconstruir desde movimientos.
3. **Caché en la API Route** con `revalidate` de Next.js si los datos no necesitan
   ser en tiempo real.

---

## Checklist de validación

Antes de cerrar la feature, verificar:

- [ ] La RPC retorna resultados correctos para un producto con movimientos frecuentes
- [ ] La RPC retorna resultados correctos para un producto sin movimientos en la ventana
      (hereda el último valor conocido)
- [ ] La RPC retorna `null` / no incluye productos sin ningún movimiento histórico
- [ ] `units_sold` coincide con lo que muestra el historial de órdenes para ese producto
- [ ] El CSV exportado abre correctamente en Excel en español (sin caracteres corruptos)
- [ ] El selector de período actualiza los datos correctamente al cambiar
- [ ] `db-max-rows` en Supabase Dashboard está configurado en al menos `10000`
      (Settings → API → Max Rows)
