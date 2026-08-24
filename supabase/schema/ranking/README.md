# Dominio: Ranking

Solo funciones, sin tabla propia — reportes de qué se vende más, calculados
al vuelo sobre `orders`/`order_items`. Consolidado en #89 (spec #81, mapa
#74). Scoping por Store de `get_top_products`/`get_top_categories` en #20
(`get_top_seller_ids` queda fuera, ver su fila abajo).

## Tablas

Ninguna en este dominio.

## Funciones RPC (las que llama la API)

| Archivo | Qué hace |
|---|---|
| `get_top_products.sql` | Top productos por unidades o facturación, ventana de fechas opcional, filtrable por categoría. Incluye margen al costo actual (no snapshot histórico). Scoped por Store desde #20: `p_store_id` requerido, autorización vía `is_store_admin()` + filtro `o.store_id`. Pasó de `LANGUAGE sql` a `plpgsql` para poder hacer el chequeo de autorización. #20 también limpió un overload huérfano (`get_top_products(4 params)`, sin `p_metric`) que quedó dando vueltas en producción y test desde antes de #89 — nunca causó un bug real porque las rutas siempre llaman con los 5 params nombrados, pero es el mismo patrón de riesgo que causó #70. |
| `get_top_categories.sql` | Top categorías por facturación, ventana de fechas opcional. Solo facturación — las unidades no son comparables entre tipos de producto. Mismo JOIN/WHERE que `get_top_products.sql` — duplicación preexistente, no resuelta acá. Scoped por Store desde #20, mismo criterio que `get_top_products.sql`. |
| `get_top_seller_ids.sql` | IDs de los top 3 productos más vendidos por subcategoría (badge "más vendido" del catálogo), con `DENSE_RANK` para empates. **Fuera de alcance de #20** — la usa el catálogo público (`fetchPublicProducts.ts`), no `/admin/ranking`; scoping de esta función queda para otro ticket. |

## Funciones trigger (no se llaman directo)

Ninguna en este dominio.

## Gaps conocidos, no corregidos acá

- `get_top_seller_ids` sigue sin scoping por Store — fuera de alcance de #20, ver su fila arriba.
