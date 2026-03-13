# Fix: unit_cost = 0 en pedidos WhatsApp

## Resumen

Los pedidos creados desde el catálogo público (flujo WhatsApp) guardaban
`unit_cost = 0.00` en `order_items` aunque los productos tuvieran precio de
costo cargado. Esto causaba que el margen y costo total se mostraran incorrectos
en las vistas de **Pedidos** y **Ventas** del panel admin.

---

## Causa raíz

El RPC `create_order()` en Supabase fue actualizado en algún momento para
agregar lógica de combos (control de stock por componentes), pero ese update
**no incluyó `unit_cost`** en el `INSERT INTO order_items`. La columna
`unit_cost` existe en la tabla y tiene `DEFAULT 0`, así que todos los pedidos
se crearon con ese valor por defecto sin que ningún error fuera visible.

El servidor de Next.js (`POST /api/orders`) calculaba el `unit_cost` correctamente:

```typescript
// src/app/api/orders/route.ts
const unit_cost = (prod && prod.price > 0)
  ? item.unit_price * (prod.cost / prod.price)
  : 0;
```

Y lo pasaba dentro del JSON `p_items` al RPC. Pero el RPC lo ignoraba porque
su `INSERT` solo listaba las columnas sin `unit_cost`:

```sql
-- Versión BUGGY del RPC
INSERT INTO order_items (
  order_id, product_id, product_name, quantity, unit_price, is_by_weight
  -- ↑ faltaba unit_cost
)
```

---

## Cómo se detectó

Al implementar la vista de **Ventas** (`/admin/sales`) se hizo visible que todos
los pedidos mostraban `total_cost = $0` y `margen = 100%`. Verificando en
Supabase directamente:

```sql
-- order_items de un pedido reciente
SELECT product_name, unit_price, unit_cost, subtotal
FROM order_items WHERE order_id = <id>;
-- → unit_cost = 0.00 en todos los ítems

-- productos correspondientes
SELECT name, price, cost FROM products WHERE id IN (...);
-- → cost > 0 en todos los productos
```

La discrepancia confirmó que el valor nunca llegaba desde el RPC.

---

## Archivos de corrección

### 1. `supabase_fix_create_order_unit_cost.sql`

Reemplaza el RPC `create_order()` con la versión corregida. El único cambio
es en el `INSERT INTO order_items`: se agregan `unit_cost` en la lista de
columnas y `COALESCE((v_item->>'unit_cost')::NUMERIC, 0)` en los valores.

Toda la lógica existente (combos, control de stock, rollback por stock
insuficiente) se preserva intacta.

**Ejecutar:** una sola vez en el SQL Editor de Supabase.
**Es seguro relanzar:** `CREATE OR REPLACE` no destruye permisos.

### 2. `supabase_backfill_unit_cost.sql`

Recalcula `unit_cost` para todos los `order_items` históricos que tienen
`unit_cost = 0` y cuyo producto tiene costo cargado.

También instala el trigger `trg_sync_order_items_cost` que, en el futuro,
sincroniza automáticamente `unit_cost` cuando el admin modifica `products.cost`.

**Ejecutar:** una sola vez, **después** del archivo anterior.
**Es idempotente:** si se corre más de una vez no produce efectos incorrectos.

---

## Orden de ejecución

```
1. supabase_fix_create_order_unit_cost.sql   ← corrige futuros pedidos
2. supabase_backfill_unit_cost.sql           ← corrige pedidos históricos
```

---

## Fórmula de unit_cost

```
unit_cost = unit_price × (products.cost / products.price)
```

Esta fórmula funciona para todos los tipos de venta porque `unit_price` en
`order_items` ya está normalizado a la misma base que `products.price`:

| Tipo   | unit_price guardado   | unit_cost resultante           |
|--------|-----------------------|-------------------------------|
| unit   | `product.price`       | `cost/price × price = cost`   |
| 100gr  | `product.price / 100` | `cost/price × price/100 = cost/100` |
| kg     | `product.price / 1000`| `cost/price × price/1000 = cost/1000` |

El ratio `cost/price` normaliza automáticamente independientemente del tipo
de venta.

---

## Verificación post-fix

```sql
-- Verificar que el backfill funcionó
SELECT o.id, oi.product_name, oi.unit_price, oi.unit_cost
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.unit_cost = 0
LIMIT 20;
```

Si devuelve filas, esos productos tienen `cost = 0` en la tabla `products`
(precio de costo no cargado en el admin panel). No es un bug.

```sql
-- Verificar que el RPC fue actualizado
SELECT prosrc FROM pg_proc WHERE proname = 'create_order';
-- Debe contener: unit_cost, COALESCE((v_item->>'unit_cost')::NUMERIC, 0)
```

---

## Pedidos afectados

Todos los pedidos creados vía WhatsApp desde el inicio hasta la fecha de
aplicación de este fix tienen `unit_cost = 0` en sus ítems. El backfill
corrige únicamente aquellos cuyos productos tienen `cost > 0` cargado en
el momento de ejecutarlo.

Los pedidos del POS no están afectados: el flujo del POS usaba un endpoint
separado que sí capturaba `unit_cost`.
