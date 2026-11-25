# Dominio: Products/Categories

Catálogo: productos, categorías y subcategorías. Consolidado en #85 (spec
#81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `products.sql` | Nunca tuvo `CREATE TABLE` en el repo — creada a mano antes de que empezara la disciplina de migraciones en archivo. Reconstruida íntegramente desde producción. Incluye una columna legacy sin documentar (`categories`, texto libre, todavía en uso). La columna legacy `main_category` y su `CHECK` se retiraron el 2026-11-10 (ver el comentario del archivo). Policies: lectura pública ve solo `active = true`; admins ven todo vía `is_store_admin()` (mismo split que `product_stock` en Stock). También incluye 2 `CREATE TRIGGER` cuyas funciones son de Orders (#84) — ver nota debajo de la tabla de triggers. Desde #92: `is_producto_surtido`/`familia_id`/`min_variedades`/`max_variedades` — FK compuesta `(familia_id, store_id)` contra `producto-surtido/familias.sql`, ver ese dominio. |
| `categories.sql` | Categorías. `UNIQUE(store_id, name)` reemplazó un `UNIQUE(name)` global en #15. |
| `product_costs.sql` | El Costo de un Producto (#179, #183): una fila por producto y Store, sin fila = "sin costo registrado". RLS solo para el Store admin. Un trigger lo espeja a `products.cost` hasta que #186/#187 migren a los demás consumidores y #189 borre la columna. Trae el paso operativo único de copiado desde `products.cost`. |
| `subcategories.sql` | Subcategorías (1 categoría → N subcategorías). Su `UNIQUE(category_id, name)` no se tocó en #15 — ya es indirectamente por-Store vía `category_id`. |

## Funciones RPC (las que llama la API)

| Archivo | Qué hace |
|---|---|
| `import_products.sql` | Creación transaccional de la Importación masiva (#179, ticket #185): crea los Productos y las categorías y subcategorías nuevas en una sola transacción, todas o ninguna. `SECURITY INVOKER`: corre con la sesión del Store admin, así que las policies de RLS son la barrera contra crear en una Store ajena. Función de admin, sin `GRANT` a `anon`. La llama `POST /api/products/import/confirm`. |

`is_store_admin()` no es RPC (no se llama vía `supabase.rpc()` desde la app, solo se usa dentro de expresiones de policy RLS). Ver la sección de funciones auxiliares.

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| `product_costs.sql` (`sync_product_cost_mirror`) | Al INSERT/UPDATE/DELETE en `product_costs`: mantiene `products.cost` igual al costo de la tabla (0 si no hay fila), sin tocar el producto si ya coincide. Transitorio, hasta #189. |
| `is_costs_enabled.sql` | Si la Store tiene el módulo `costos` (#187): función dedicada, mismo criterio que `is_stock_tracked()`. La usa `sync_combo_cost`; sin la flag no se calcula el costo de un combo. Sin `GRANT` a `anon`. |
| `update_updated_at_column.sql` | Genérico, usado por `products`/`categories`/`subcategories` (este dominio), `stores` (#87) y `product_stock` (Stock #83). No confundir con `handle_updated_at()` (#87, distinta función, específica de `profiles`). |

`products.sql` también declara `trg_log_price_change` y `trg_sync_order_items_cost` — sus funciones (`log_price_change()`, `sync_order_items_unit_cost()`) son de Orders (#84), viven en `supabase/schema/orders/`. Se declaran acá porque `products` es la tabla a la que están atadas (el trigger se declara junto a la tabla, la función junto a quien la posee semánticamente).

## Funciones auxiliares (no son RPC ni trigger — usadas dentro de policies RLS o como columna calculada)

| Archivo | Qué hace |
|---|---|
| `effective_price.sql` | Punto único de lectura del Precio (#179, ticket 1): columna calculada de `products` que devuelve lo que se cobra. Hoy es `products.price`; más adelante puede calcularse por fórmula sin tocar a los consumidores. `SECURITY INVOKER` con `GRANT` a `anon` (la usa el catálogo público). El formulario de producto sigue leyendo y escribiendo `products.price` (precio manual de entrada). |
| `is_store_admin.sql` | La función compartida por casi todas las policies RLS de todos los dominios. Vive acá por la regla de #78 (un archivo por función) y porque su primera definición fue en el ticket de scoping de Products (#15). |

## Archivos compartidos entre dominios

`supabase_combos.sql` ya no es compartido — de acá se extrajeron las columnas `is_combo`/`max_stock` de `products` (desde #184 el máximo vive en `product_stock.max_stock`; la columna vieja de `products` queda sin uso hasta #189); Orders (#84) y Combos (#86) confirmaron después sus partes, así que el archivo se archivó completo en #86.

`supabase_pricing.sql` tampoco es compartido — Orders (#84) y Products (#85) confirmaron ambas sus partes, así que se archivó completo en este ticket.

## Gaps conocidos, no corregidos acá

- Columna `products.categories` (texto libre, legacy): desde #181 (spec #179) ya no es obligatoria (nullable, `DEFAULT ''`) y ninguna parte de la app la lee ni la escribe; el catálogo agrupa por categoría y subcategoría normalizadas. Los valores viejos se conservan. Se borra en el ticket de limpieza #189. Los datos de `supabase/seed/demo-store.sql` todavía la mencionan: es inocuo hasta ese borrado.
