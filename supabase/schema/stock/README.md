# Dominio: Stock

Control manual de inventario por producto, con historial de movimientos y
alertas de stock bajo. Consolidado en #83 (spec #81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `product_stock.sql` | Stock actual de cada producto (1:1 con `products`). Incluye policies RLS: lectura pública sin restricción (sostiene el catálogo público), escritura scoped por Store vía `is_store_admin()`. |
| `stock_movement_log.sql` | Historial inmutable (solo INSERT) de cada cambio de stock, para auditoría. Alimentado por los dos triggers de abajo, no por escritura directa desde la app. |

## Funciones RPC (llamadas desde la API)

| Archivo | Qué hace |
|---|---|
| `upsert_product_stock.sql` | Crea o **reemplaza** el stock de un producto. Objeto de prioridad 1 (ver `docs/agents/schema-changes.md`). |
| `increment_product_stock.sql` | **Suma** una cantidad al stock existente, no lo reemplaza. Objeto de prioridad 1. Desde #122, "Ingreso de Stock" ya no la llama directo por fila — pasa por `increment_product_stock_batch()`, que la reusa internamente por entrada del lote. |
| `increment_product_stock_batch.sql` | Ingreso de stock por lote (#122, arregla el N+1 del audit #106) — un solo round-trip, best-effort por fila vía un bloque `BEGIN/EXCEPTION` por entrada (savepoint implícito), delegando la validación de cada fila a `increment_product_stock()` en vez de reimplementarla. Desde #154 valida `is_store_admin()` por su cuenta antes del loop (antes el Forbidden de la interna se tragaba como `success:false` por fila) y no tiene `EXECUTE` para `anon`. |
| `get_all_products_with_stock.sql` | Lista todos los productos de una Store con su stock, incluyendo stock virtual de combos. Desde #133 expone `category_name` (LEFT JOIN `categories`) en lugar de la columna legacy `main_category`. Objeto de prioridad 1 — tuvo una regresión real (perdió la lógica de combos al agregarle store scoping), ver el header del archivo. |
| `get_low_stock_products.sql` | Productos activos por debajo de su `min_stock`, para las alertas del panel admin. Desde #133 expone `category_name` en lugar de `main_category`. Objeto de prioridad 1. |
| `get_available_stock.sql` | Disponible de los productos de una Store (#159, ver `CONTEXT.md`): stock propio, o combos completos que alcanzan con sus componentes, 0 sin fila (sin tope por `max_stock`, a propósito), nunca negativo. Sin Control de stock no devuelve filas. La consume el catálogo público (anónimo, SECURITY INVOKER) en sus dos caminos, bulk y por producto. |
| `get_avg_stock_per_product.sql` | Stock promedio por producto en una ventana de fechas (usa `stock_movement_log` para reconstruir días pasados). Scoped por Store desde #21. |
| `get_stock_value_per_day.sql` | Valor del stock al costo, por categoría y por día. Misma lógica de snapshot que la anterior. Scoped por Store desde #21. |

## Funciones trigger (no se llaman directo, disparadas por `product_stock`)

| Archivo | Cuándo dispara |
|---|---|
| `log_initial_stock.sql` | Al INSERT en `product_stock` (si `quantity > 0`) — registra la carga inicial en `stock_movement_log`. Setea `store_id` desde `NEW.store_id` (#52). |
| `log_stock_change.sql` | Al UPDATE en `product_stock` (si `quantity` cambió) — registra el movimiento, leyendo el `movement_type` que las RPCs de arriba setean vía `set_config`. Setea `store_id` desde `NEW.store_id` (#52). |

## Funciones auxiliares (no son RPC ni trigger)

| Archivo | Qué hace |
|---|---|
| `is_stock_tracked.sql` | Resuelve si una Store trackea stock (flag `stock` de `stores.feature_flags`, #23). Usada desde Orders (#97, ver ADR-0012) por `create_order`/`adjust_stock_on_item_update`/`cancel_order`/`return_stock_on_item_delete` — con `stock:false`, ninguna de las 4 chequea ni escribe `product_stock`. Desde #159 también la usa `get_available_stock()`: sin Control de stock no devuelve filas. Mismo criterio que `is_store_admin()` (Products): función dedicada y específica, no genérica. |

## Gaps conocidos, no corregidos acá

- **Vista legacy `v_product_stock`** (primer control de stock, misma forma que `get_all_products_with_stock` pero sin scoping por Store y corriendo como su dueño `postgres`, marcada por el advisor de Supabase): existía en producción sin estar en el repo, y ningún código la leía — la API usa la RPC. Se retira en #133 (`DROP VIEW public.v_product_stock;`), después de haberla documentado brevemente al armar la base local (#152).
- **`/admin/stock` todavía no usa el Disponible** (#159): `get_all_products_with_stock()` calcula el stock de un combo con `get_combo_effective_stock()`, que no acota a 0 y da `NULL` para un combo sin componentes, mientras que el catálogo usa `get_available_stock()` (0 en ambos casos). Desde #160 `product_stock` admite negativos, así que también difieren ahí: un combo con un componente negativo puede verse negativo en `/admin/stock` y 0 en el catálogo. Pendiente que el admin pase a la misma regla (o lo resuelva #156, que decide cómo se muestra el stock negativo).
- **Prender o apagar la flag `stock` no invalida el stock cacheado del catálogo** (#159): el camino del catálogo completo no cachea, pero búsqueda y paginación por categoría usan el cache por producto (sin vencimiento por tiempo, ADR-0014), que sigue sirviendo el Disponible viejo (o `undefined`) hasta el próximo cambio de stock de cada producto. Hoy las flags se cambian por SQL y no hay ruta que pueda invalidar ese cache; la edición de flags por UI es #71.
- El gap anterior de este dominio (`stock_movement_log` sin `store_id` en sus inserts) se cerró en #52.
