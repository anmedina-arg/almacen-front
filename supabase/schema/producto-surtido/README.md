# Dominio: Producto Surtido

Familias y Variedades — la base de catálogo de Producto Surtido: productos
que se arman eligiendo Variedades de una Familia compartida (helado,
masas, y lo que venga) en vez de venderse tal cual. Consolidado en #92
(spec #91, mapa #74). Dominio nuevo — no encajaba en Products/Categories
ni en Combos (ver ADR-0009: Variedad es una etiqueta propia, no reusa el
patrón `combo_components` de `products`-a-`products`).

## Tablas

| Archivo | Qué es |
|---|---|
| `familias.sql` | Agrupa los tamaños/presentaciones de un Producto Surtido que comparten la misma lista de Variedades. `UNIQUE(id, store_id)` sostiene las FK compuestas de `variedades.sql` y de `products.familia_id` — una Variedad o un Producto Surtido no pueden referenciar una Familia de otra Store a nivel de schema. |
| `variedades.sql` | Etiqueta elegible al armar un Producto Surtido — sin precio ni stock propio (ADR-0009). Pertenece a una única Familia vía `familia_id` (FK simple, no tabla puente — la exclusividad es estructural). Deshabilitar una (`active = false`) la saca de elección para toda su Familia sin ningún mecanismo extra: el pool elegible siempre se lee filtrando por `familia_id` + `active = true`. |

`products` (dominio Products/Categories) gana las columnas `is_producto_surtido`/`familia_id`/`min_variedades`/`max_variedades` en #92 — documentadas en `products.sql`, no acá, mismo criterio que `order_items.from_suggestion` documentando su origen en el dominio que la agregó sin mudar el archivo.

## Funciones RPC (las que llama la API)

Ninguna en este dominio todavía — alta/edición de Familias y Variedades pasa directo por policies RLS (INSERT/UPDATE/DELETE con `is_store_admin()`), sin RPC intermedia, mismo patrón que `categories`/`subcategories`.

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| — | Ninguna propia — ambas tablas reusan `update_updated_at_column()` (Products #85), declarado inline en `familias.sql`/`variedades.sql` sin redefinir la función. |

## Gaps conocidos, no corregidos acá

- Sin RPC ni UI de administración todavía — este ticket (#92) es solo el schema, verificado de punta a punta contra el proyecto de test. La UI de Familias/Variedades (tercera sección del panel de Categorías/Subcategorías) y el resto del flujo (catálogo/carrito, persistencia de la elección en el pedido) son tickets de dominio aparte (#93-#95, spec #91).
- La selección de Variedades de una línea de pedido (con el nombre congelado al momento del pedido, mismo patrón que `order_items.product_name`) todavía no tiene tabla — corresponde al dominio Orders, ticket #95.
