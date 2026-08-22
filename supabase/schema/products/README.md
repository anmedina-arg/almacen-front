# Dominio: Products/Categories

Catálogo: productos, categorías y subcategorías. Consolidado en #85 (spec
#81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `products.sql` | Nunca tuvo `CREATE TABLE` en el repo — creada a mano antes de que empezara la disciplina de migraciones en archivo. Reconstruida íntegramente desde producción. Incluye una columna legacy sin documentar (`categories`, texto libre, todavía en uso) y un `CHECK` de `main_category` tampoco documentado antes. |
| `categories.sql` | Categorías. `UNIQUE(store_id, name)` reemplazó un `UNIQUE(name)` global en #15. |
| `subcategories.sql` | Subcategorías (1 categoría → N subcategorías). Su `UNIQUE(category_id, name)` no se tocó en #15 — ya es indirectamente por-Store vía `category_id`. |

## Funciones

| Archivo | Qué hace |
|---|---|
| `is_store_admin.sql` | La función compartida por casi todas las policies RLS de todos los dominios. Vive acá por la regla de #78 (un archivo por función) y porque su primera definición fue en el ticket de scoping de Products (#15). |
| `update_updated_at_column.sql` | Trigger genérico de `updated_at`, usado por `products`/`categories`/`subcategories` (este dominio), `stores` (#87) y `product_stock` (Stock #83). No confundir con `handle_updated_at()` (#87, distinta función, específica de `profiles`). |

## Triggers de otros dominios declarados acá

`products.sql` incluye dos `CREATE TRIGGER` cuyas funciones pertenecen a Orders (#84) — se declaran acá porque `products` es la tabla a la que están atados (mismo criterio de todo el mapa: el trigger se declara junto a la tabla, la función junto a quien la posee semánticamente):

- `trg_log_price_change` → `log_price_change()`, en `supabase/schema/orders/log_price_change.sql`.
- `trg_sync_order_items_cost` → `sync_order_items_unit_cost()`, en `supabase/schema/orders/sync_order_items_unit_cost.sql`.

## Archivos compartidos entre dominios

- **`supabase_combos.sql`** (Combos, #86 — pendiente) — de acá se extrajeron las columnas `is_combo`/`max_stock` de `products`. Lo que falta: `combo_components`, `sync_combo_cost`, `get_combo_effective_stock`.

`supabase_pricing.sql` ya no es compartido — Orders (#84) y Products (#85) confirmaron ambas sus partes, así que se archivó completo en este ticket.

## Gaps conocidos, no corregidos acá

- Columna `products.categories` (texto libre) convive con el sistema normalizado `category_id`/`subcategory_id` sin que ninguno haya reemplazado al otro — deuda técnica preexistente, no introducida ni resuelta acá.
