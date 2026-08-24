# Dominio: Orders

Ciclo de vida del pedido: creación (con descuento de stock), confirmación,
cancelación (con devolución de stock), edición de ítems, historial de
precio/costo. Consolidado en #84 (spec #81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `orders.sql` | La orden en sí (incluye el tipo `order_status`). `client_id` (FK a `clients`) y `store_id` los agregaron migraciones de otros dominios — ver "Archivos compartidos" abajo. |
| `order_items.sql` | Ítems de una orden. `unit_cost`/`from_suggestion` los agregaron migraciones de otros dominios — ídem. |
| `order_payments.sql` | Método(s) de pago de una orden (efectivo/transferencia). |
| `product_price_history.sql` | Historial append-only de precio/costo — alimentado por `log_price_change` (ver abajo), no por escritura directa. **No está scoped por Store** — ver Gaps conocidos. |

## Funciones RPC (llamadas desde la API)

| Archivo | Qué hace |
|---|---|
| `create_order.sql` | Crea la orden + ítems, descuenta stock (combo-aware). Ya resuelta en #49 — reubicada sin re-verificar. |
| `confirm_order.sql` | Pasa una orden `pending` a `confirmed`. No estaba en el AC original de #84 — se agregó al notar que vivía en el mismo archivo fuente que `cancel_order`, para no dejarla huérfana. |
| `cancel_order.sql` | Cancela una orden, devuelve stock (combo-aware). |

`confirm_order`/`cancel_order` son `SECURITY DEFINER` sin `p_store_id` — la verificación de que la orden pertenece a la Store del caller se hace en la ruta de API, antes de invocar el RPC.

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| `recalculate_order_total.sql` | Al INSERT/UPDATE/DELETE en `order_items` — recalcula `orders.total`. |
| `update_orders_updated_at.sql` | Al UPDATE en `orders`. |
| `adjust_stock_on_item_update.sql` | Al UPDATE de `quantity` en `order_items` (orden `pending`) — ajusta stock por la diferencia, combo-aware. |
| `return_stock_on_item_delete.sql` | Al DELETE en `order_items` (orden `pending`) — devuelve stock, combo-aware. |
| `sync_order_items_unit_cost.sql` | Al UPDATE de `products.cost` — sincroniza `order_items.unit_cost` en pedidos con `unit_cost = 0`. Dispara sobre `products`, tabla de Products (#85) — el `CREATE TRIGGER` que la ata vive en `supabase/schema/products/products.sql` (agregado por #85), no acá. |
| `log_price_change.sql` | Al INSERT/UPDATE en `products` — registra en `product_price_history`. Mismo caso: el `CREATE TRIGGER` vive en `supabase/schema/products/products.sql`. |

## Archivos compartidos entre dominios

Ninguno de estos se descarta hasta que el otro dominio confirme su parte:

- **`supabase_combos.sql`** (Combos, #86 — ✅ completado) — de acá se extrajeron las versiones combo-aware de `cancel_order`/`adjust_stock_on_item_update`/`return_stock_on_item_delete`. #86 extrajo `combo_components`/`sync_combo_cost`/`get_combo_effective_stock`, último dominio en confirmar su parte — este archivo se archivó completo en #86.
- **`supabase_pricing.sql`** (Products, #85 — ✅ completado) — de acá se extrajo `product_price_history`, `log_price_change`, `sync_order_items_unit_cost`, columna `order_items.unit_cost`. #85 extrajo la columna `products.cost` que faltaba — este archivo puede archivarse ahora que ambos dominios confirmaron su parte.
- **`supabase_recommendations.sql`** (Recomendaciones, #90 — ✅ completado) — de acá se extrajo la columna `order_items.from_suggestion`. #90 extrajo `product_affinity`, `category_affinity_rules`, `get_recommendations`, `refresh_product_affinity` — este archivo (y sus dos fixes) se archivaron completos en #90.
- **`supabase_clients.sql`** (Clients, #88 — ✅ completado) — de acá se extrajo la columna `orders.client_id`. #88 extrajo la tabla `clients` en sí y sus policies — este archivo se archivó completo en #88.
- **`supabase_fix_super_admin_remaining_policies.sql`** (fix pre-existente, 2026-08-19, toca 6 tablas de 3 dominios — ✅ completado) — de acá se extrajo la policy vigente de `product_price_history` (reconoce `super_admin` además de `admin`). Sus partes de `product_stock`/`stock_movement_log` ya estaban muertas (superseded por #83), y las de `combo_components`/`clients`/`category_affinity_rules` fueron extraídas por #18/#88/#90 respectivamente — último dominio en confirmar (#90), archivo archivado completo.
- **`supabase_store_scoping_orders.sql`** (#16, Clients #88 — ✅ completado) — de acá se extrajeron las policies de `orders`/`order_items`/`order_payments`. #88 extrajo los índices únicos `clients_unique_lot`/`clients_unique_otros_sin_desc` que faltaban — este archivo se archivó completo en #88.

## Gaps conocidos, no corregidos acá

- `product_price_history`: su policy de lectura no filtra por `is_store_admin(store_id)`, a pesar de tener `store_id` con FK e índice propios — chequea rol global (`admin`/`super_admin`). Mismo tipo de gap que `get_avg_stock_per_product`/`get_stock_value_per_day` en el dominio Stock.
