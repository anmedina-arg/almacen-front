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
| `increment_product_stock.sql` | **Suma** una cantidad al stock existente, no lo reemplaza — usada por "Ingreso de Stock". Objeto de prioridad 1. |
| `get_all_products_with_stock.sql` | Lista todos los productos de una Store con su stock, incluyendo stock virtual de combos. Objeto de prioridad 1 — tuvo una regresión real (perdió la lógica de combos al agregarle store scoping), ver el header del archivo. |
| `get_low_stock_products.sql` | Productos activos por debajo de su `min_stock`, para las alertas del panel admin. Objeto de prioridad 1. |
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
| `is_stock_tracked.sql` | Resuelve si una Store trackea stock (flag `stock` de `stores.feature_flags`, #23). Usada desde Orders (#97, ver ADR-0012) por `create_order`/`adjust_stock_on_item_update`/`cancel_order`/`return_stock_on_item_delete` — con `stock:false`, ninguna de las 4 chequea ni escribe `product_stock`. Mismo criterio que `is_store_admin()` (Products): función dedicada y específica, no genérica. |

## Gaps conocidos, no corregidos acá

Ninguno — el último gap de este dominio (`stock_movement_log` sin `store_id` en sus inserts) se cerró en #52.
