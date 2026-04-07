# Dashboard — Rotación de Inventario

## Descripción

Tabla en `/admin/dashboard` que muestra la rotación de cada producto activo durante una ventana de tiempo configurable.

**Fórmula:** `rotación = unidades_vendidas / stock_promedio`

**Períodos disponibles:** 7 / 15 / 30 / 60 / 90 días

**Columnas:** # · Producto · Categoría · Ventas · Stock prom. · Rotación · Nivel

**Nivel (badge):**
- Alta: rotación ≥ 1×
- Media: rotación ≥ 0.3×
- Baja: rotación < 0.3×

**Exportación:** botón CSV en el encabezado, incluye BOM para compatibilidad con Excel en español.

---

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `src/app/api/dashboard/rotation/route.ts` | API Route — cálculo y consultas |
| `src/features/admin/components/dashboard/InventoryRotationTable.tsx` | Componente UI |
| `src/features/admin/hooks/useInventoryRotation.ts` | Hook TanStack Query |
| `src/features/admin/services/dashboardService.ts` | `getRotation(days)` fetch |
| `src/features/admin/constants/queryKeys.ts` | `adminKeys.dashboardRotation(days)` |

---

## Lógica del cálculo (route.ts)

### Ventas (`units_sold`)

Query a `order_items` con join `!inner` a `orders`, filtrando:
- `orders.status IN ('pending', 'confirmed')`
- `orders.created_at >= startDate`

El valor de `quantity` en `order_items` está en **gramos** para productos `kg` y `100gr`, y en unidades para `unit`.

### Stock promedio (`avg_stock`)

Se calcula con **promedio ponderado por tiempo** sobre `stock_movement_log`.

La tabla `stock_movement_log` registra `new_qty` (snapshot del stock después de cada movimiento) y `created_at`. Los movimientos están en **gramos** para productos `kg` y `100gr`.

**Algoritmo `calcTimeWeightedAvgStock`:**

```
avg = SUM(stock_nivel_i × duración_i_en_ms) / duración_total_del_período_en_ms
```

1. Recorre los movimientos en orden ASC buscando el último antes de `startDate` → establece el stock inicial del período.
2. Para cada movimiento dentro del período: acumula `stock_actual × (ts_movimiento - ts_anterior)`.
3. Intervalo final: `stock_último × (endDate - ts_último_movimiento)`.

**Por qué promedio ponderado y no promedio diario simple:**

Un promedio diario de snapshots al cierre del día subestimaría el stock en productos que son restockeados y vendidos el mismo día. Por ejemplo: si un producto tiene 485g al inicio del día, se vende durante la jornada y queda en 285g al cierre, el snapshot diario captura solo 285g aunque el producto estuvo disponible a 485g durante horas.

El promedio ponderado refleja cuánto stock hubo disponible y por cuánto tiempo, lo cual es más representativo del stock real del período.

---

## Bugs encontrados y resueltos

### 1. Límite default de PostgREST (1000 filas)

**Problema:** PostgREST aplica un límite de 1000 filas por defecto. Las queries sin `.limit()` explícito cortaban silenciosamente. Afectó:
- Query de `orders` con ventanas largas
- Query de `order_items` (~1179 items en 15 días)
- Query de `stock_movement_log` (~3410 filas totales)

**Fix aplicado:** Se agregó `.limit(100000)` en las queries y se simplificó la arquitectura usando join `!inner` en lugar de dos queries separadas.

---

### 2. Cálculo de ventas incorrecto (two-step fetch)

**Problema:** La implementación original hacía dos queries: primero obtenía IDs de órdenes, luego buscaba `order_items` por esos IDs. Con muchas órdenes esto era frágil y susceptible a errores de límite.

**Fix:** Una sola query con `orders!inner` en PostgREST, filtrando status y fecha directamente:

```ts
supabase
  .from('order_items')
  .select('product_id, quantity, orders!inner(status, created_at)')
  .filter('orders.status', 'in', '("pending","confirmed")')
  .gte('orders.created_at', startIso)
  .limit(100000)
```

---

### 3. `avg_stock` mostraba valores imposibles (2g)

**Problema:** Para "Bondiola 214 SIN GLUTEN" (product_id 273), la tabla mostraba `avg_stock = 2g` con `units_sold = 200g` → `rotación = 100×`. Imposible físicamente para un producto vendido en unidades de 100g.

**Investigación:**

1. Se verificó la DB directamente:
   ```sql
   SELECT new_qty, created_at, movement_type
   FROM stock_movement_log
   WHERE product_id = 273
   ORDER BY created_at DESC LIMIT 20;
   ```
   La DB tenía 7-8 movimientos correctos (285g, 485g, 585g, 685g...).

2. Se agregó log de debug al route:
   ```
   [DEBUG 273] movements count: 3
   [DEBUG 273] last 3 movements: [5g (Feb-24), 3g (Mar-07), 2g (Mar-07)]
   ```
   Solo llegaban 3 movimientos al cálculo. Los del 12/03 en adelante no estaban.

**Causa raíz:** `db-max-rows` en Supabase (configuración server-side de PostgREST) tiene un límite de **1000 filas** que **sobreescribe** el `.limit(100000)` del cliente. Con ~3410 movimientos totales ordenados ASC, los movimientos de product_id 273 a partir del 12/03 caían más allá de la fila 1000 y no eran retornados.

**Fix en código:**

```ts
supabase
  .from('stock_movement_log')
  .select('product_id, new_qty, created_at')
  .gte('created_at', new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: true })
  .limit(10000)
```

El filtro de `startDate - 90 días` reduce drásticamente el volumen de filas, manteniendo suficiente historia para establecer el stock inicial de cualquier producto para la ventana solicitada.

**⚠️ Acción pendiente en Supabase:**

El fix de código **no es suficiente por sí solo**. Si `db-max-rows = 1000` en el servidor PostgREST de Supabase, la query seguirá siendo truncada a 1000 filas aunque el cliente pida 10000.

**Pasos requeridos:**
1. Supabase Dashboard → **Settings → API → "Max Rows"**
2. Cambiar de `1000` a `10000` (o más según el volumen de movimientos del negocio)
3. Guardar y verificar que el `.limit(10000)` del código ahora se respeta

---

### 4. Stock inicial mal cargado (dato histórico)

**Observación:** Product_id 273 tenía un `initial_count` de `5.000` (5 gramos) registrado el 24/02. Para un producto `100gr`, el mínimo de venta es 100g por click, por lo que 5g es un dato inválido. Lo más probable es que se haya ingresado "5" significando "5 unidades" de 100g = 500g, pero el sistema lo guardó como 5 gramos.

Esto dejó el producto con 2g de stock efectivo durante semanas (5 → 3 → 2 con ventas del 7/03), hasta el purchase del 12/03 que lo llevó a 685g correctamente.

**Este no es un bug del cálculo.** El cálculo es correcto dado los datos en la DB. Es un dato histórico mal inicializado que no se puede corregir masivamente sin afectar el historial de auditoría.

---

## Estado actual

| Ítem | Estado |
|---|---|
| Query de ventas (order_items + !inner join) | ✅ Correcto |
| Cálculo time-weighted avg stock | ✅ Implementado |
| Filtro de fecha en movements query | ✅ Aplicado (startDate - 90 días) |
| Exportación CSV | ✅ Implementado |
| `db-max-rows` en Supabase Dashboard | ⚠️ **Pendiente — requiere acción manual** |
| Validación end-to-end con `db-max-rows` aumentado | ⏳ Pendiente |

---

## Consideraciones de escala

A medida que crezca el volumen de movimientos en `stock_movement_log`, el filtro de `startDate - 90 días` puede quedar insuficiente si la densidad de movimientos supera los `db-max-rows` configurados.

Si en el futuro se vuelve a ver el problema (avg_stock incorrecto o productos que deberían aparecer y no aparecen), la causa probable será este límite. Las opciones a largo plazo son:

1. **Aumentar `db-max-rows`** progresivamente según crezca el negocio.
2. **Función RPC en PostgreSQL** que calcule el avg_stock server-side (sin límites PostgREST), retornando solo el resultado por producto.
3. **Tabla de snapshots diarios** materializada, que pre-calcule el stock al inicio de cada día y elimine la necesidad de reconstruir histórico desde los movimientos.
