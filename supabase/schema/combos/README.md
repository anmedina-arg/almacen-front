# Dominio: Combos

Un combo es un producto normal (`products.is_combo = true`) cuyo stock se
deriva del stock de sus componentes en vez de cargarse a mano. Consolidado
en #86 (spec #81, mapa #74). Alcance reducido a propósito: `create_order`
ya estaba resuelta (#49) y `cancel_order`/`adjust_stock_on_item_update`/
`return_stock_on_item_delete` son de Orders (#84) aunque también vivan
históricamente en `supabase_combos.sql` — ninguna de las cuatro se
re-deriva ni se posee acá.

## Tablas

| Archivo | Qué es |
|---|---|
| `combo_components.sql` | Un componente de un combo: cuánto de `component_product_id` entra en una unidad de `combo_product_id`. Policies: lectura pública sin restricción (sostiene el catálogo público, igual que `product_stock` en Stock); escritura scoped por Store vía `is_store_admin()`. |

## Funciones RPC (las que llama la API)

Ninguna en este dominio.

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| `sync_combo_cost.sql` | Al INSERT/UPDATE/DELETE en `combo_components` — recalcula `products.cost` del combo como suma de (cantidad × costo) de cada componente. |

## Funciones auxiliares (no son RPC ni trigger)

| Archivo | Qué hace |
|---|---|
| `get_combo_effective_stock.sql` | Stock virtual de un combo: mínimo de (stock del componente / cantidad por unidad de combo). Llamada desde `get_all_products_with_stock()` (Stock, ya scoped por Store desde ese lado). |

Ninguna de las dos funciones de arriba gana `p_store_id` propio — ambas operan sobre un `product_id` ya resuelto por su caller; agregar el parámetro sería *Speculative Generality* sin un caller real que lo necesite (decidido en #18).

## Archivos compartidos — ya resueltos

`supabase_combos.sql` y `supabase_store_scoping_combos.sql` quedaron completamente extraídos entre Stock (#83, `get_all_products_with_stock`), Orders (#84, `cancel_order`/`adjust_stock_on_item_update`/`return_stock_on_item_delete`, `create_order` ya resuelta en #49), Products (#85, columnas `is_combo`/`max_stock`) y este ticket (`combo_components`, `sync_combo_cost`, `get_combo_effective_stock`) — Combos es el último dominio en confirmar su parte, así que ambos archivos se archivaron completos acá.
