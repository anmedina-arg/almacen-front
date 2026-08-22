# Dominio: Products/Categories

Catálogo: productos, categorías y subcategorías. Consolidado en #85 (spec
#81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `products.sql` | Nunca tuvo `CREATE TABLE` en el repo — creada a mano antes de que empezara la disciplina de migraciones en archivo. Reconstruida íntegramente desde producción. Incluye una columna legacy sin documentar (`categories`, texto libre, todavía en uso) y un `CHECK` de `main_category` tampoco documentado antes. Policies: lectura pública ve solo `active = true`; admins ven todo vía `is_store_admin()` (mismo split que `product_stock` en Stock). También incluye 2 `CREATE TRIGGER` cuyas funciones son de Orders (#84) — ver nota debajo de la tabla de triggers. |
| `categories.sql` | Categorías. `UNIQUE(store_id, name)` reemplazó un `UNIQUE(name)` global en #15. |
| `subcategories.sql` | Subcategorías (1 categoría → N subcategorías). Su `UNIQUE(category_id, name)` no se tocó en #15 — ya es indirectamente por-Store vía `category_id`. |

## Funciones RPC (las que llama la API)

Ninguna en este dominio — `is_store_admin()` no es RPC (no se llama vía `supabase.rpc()` desde la app, solo se usa dentro de expresiones de policy RLS). Ver "Funciones auxiliares" abajo.

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| `update_updated_at_column.sql` | Genérico, usado por `products`/`categories`/`subcategories` (este dominio), `stores` (#87) y `product_stock` (Stock #83). No confundir con `handle_updated_at()` (#87, distinta función, específica de `profiles`). |

`products.sql` también declara `trg_log_price_change` y `trg_sync_order_items_cost` — sus funciones (`log_price_change()`, `sync_order_items_unit_cost()`) son de Orders (#84), viven en `supabase/schema/orders/`. Se declaran acá porque `products` es la tabla a la que están atadas (el trigger se declara junto a la tabla, la función junto a quien la posee semánticamente).

## Funciones auxiliares (no son RPC ni trigger — usadas dentro de policies RLS)

| Archivo | Qué hace |
|---|---|
| `is_store_admin.sql` | La función compartida por casi todas las policies RLS de todos los dominios. Vive acá por la regla de #78 (un archivo por función) y porque su primera definición fue en el ticket de scoping de Products (#15). |

## Archivos compartidos entre dominios

- **`supabase_combos.sql`** (Combos, #86 — pendiente) — de acá se extrajeron las columnas `is_combo`/`max_stock` de `products`. Lo que falta: `combo_components`, `sync_combo_cost`, `get_combo_effective_stock`.

`supabase_pricing.sql` ya no es compartido — Orders (#84) y Products (#85) confirmaron ambas sus partes, así que se archivó completo en este ticket.

## Gaps conocidos, no corregidos acá

- Columna `products.categories` (texto libre) convive con el sistema normalizado `category_id`/`subcategory_id` sin que ninguno haya reemplazado al otro — deuda técnica preexistente, no introducida ni resuelta acá.
