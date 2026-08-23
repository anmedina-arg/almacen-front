# Dominio: Ranking

Solo funciones, sin tabla propia — reportes de qué se vende más, calculados
al vuelo sobre `orders`/`order_items`. Consolidado en #89 (spec #81, mapa
#74). Prepara terreno para #20 (Scoping por Store: Ranking).

## Tablas

Ninguna en este dominio.

## Funciones RPC (las que llama la API)

| Archivo | Qué hace |
|---|---|
| `get_top_products.sql` | Top productos por unidades o facturación, ventana de fechas opcional, filtrable por categoría. Incluye margen al costo actual (no snapshot histórico). |
| `get_top_categories.sql` | Top categorías por facturación, ventana de fechas opcional. Solo facturación — las unidades no son comparables entre tipos de producto. |
| `get_top_seller_ids.sql` | IDs de los top 3 productos más vendidos por subcategoría (badge "más vendido" del catálogo), con `DENSE_RANK` para empates. |

## Funciones trigger (no se llaman directo)

Ninguna en este dominio.

## Gaps conocidos, no corregidos acá

- Ninguna de las 3 funciones está scoped por Store (sin `p_store_id`, sin filtro por `store_id` en ninguna tabla) — es exactamente lo que resuelve #20, el ticket de producto que este ticket de reorganización prepara. No se adelanta acá.
