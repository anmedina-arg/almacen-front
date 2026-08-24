# Dominio: Recomendaciones/Informes

Afinidad de productos/categorías (sugerencias del catálogo) y las
funciones de export que respaldan la página "Informes" — una sola feature
flag que agrupa reportes CSV + recomendaciones (ver `CONTEXT.md`).
Consolidado en #90 (spec #81, mapa #74). Scoping por Store del recálculo de
afinidad y de los exports (`refresh_product_affinity`, `export_productos`,
`export_ventas`) en #21 — `get_recommendations()` (lectura pública) queda
fuera, ver su fila abajo.

## Tablas

| Archivo | Qué es |
|---|---|
| `product_affinity.sql` | Matriz de afinidad producto-a-producto, recalculada por `refresh_product_affinity()`. Lectura pública sin restricción — la API de recomendaciones del catálogo es pública. `store_id` es NOT NULL desde #22. |
| `category_affinity_rules.sql` | Reglas manuales de boost entre categorías, usadas como multiplicador dentro de `refresh_product_affinity()` — no como fuente directa de sugerencias, ver la nota en `get_recommendations.sql`. Policy de escritura scoped por Store desde #21 (`is_store_admin(store_id)`, antes chequeaba rol global). Sin UI de CRUD todavía — las reglas existentes se gestionan a mano en el SQL Editor. `store_id` es NOT NULL desde #22 — las 2 reglas que hay hoy en producción ya tenían `store_id` seteado (market-del-cevil), la suposición de "todas con store_id NULL" de #21 no se verificó contra datos reales en su momento. Consecuencia: `refresh_product_affinity()` ya no puede tener un concepto de "regla global" (`store_id NULL`) — se sacó esa rama del código en #22, ver su header. |

## Funciones RPC (las que llama la API)

| Archivo | Qué hace |
|---|---|
| `get_recommendations.sql` | Sugerencias para el carrito: afinidad histórica primero, completa con más vendidos globales. **Importante**: `supabase_category_affinity.sql` proponía una versión posterior (usa `category_affinity_rules` directamente, sin depender de co-ocurrencia) — verificado que esa versión nunca se aplicó en ningún entorno, a pesar de ser el archivo más nuevo por fecha. La vigente es la de `supabase_recommendations_fix.sql`. **Fuera de alcance de #21** — sigue sin `p_store_id`, sigue leyendo `product_affinity` sin filtrar por Store (endpoint público `/api/recommendations`, no listado en el alcance de #21). Ver Gaps abajo. |
| `refresh_product_affinity.sql` | Recalcula `product_affinity` desde cero. Se llama manualmente desde `/admin/informes`. Scoped por Store desde #21: `p_store_id` requerido, autorización vía `is_store_admin()`, co-ocurrencias filtradas por `orders.store_id`. El `TRUNCATE TABLE` (que vaciaba toda la tabla, de todas las Stores) pasa a un `DELETE` acotado a las filas propias de esta Store más los pares de producto que se están recalculando — nunca "cualquier fila de la tabla". Desde #22, `category_affinity_rules.store_id` es NOT NULL — se sacó la rama `OR r.store_id IS NULL` del JOIN contra esa tabla (ya no hay reglas "globales" que bridgear). |
| `export_productos.sql` | Catálogo completo con costo/margen/stock (virtual para combos) — CSV de "Informes". Scoped por Store desde #21: `p_store_id` requerido, pasa de `LANGUAGE sql` a `plpgsql` para el chequeo de autorización. |
| `export_ventas.sql` | Detalle de ventas, una fila por ítem — CSV de "Informes". Scoped por Store desde #21: `p_store_id` requerido. Esto de paso resolvió el gap de entorno que tenía (test con una firma más vieja, sin `desde_sugerencia`, ver Historial abajo) — al cambiar la firma para el scoping, ambos entornos quedaron en la misma versión. |

## Funciones trigger (no se llaman directo)

Ninguna en este dominio.

## Archivos compartidos — ya resueltos

Este ticket fue el último en confirmar su parte de dos archivos que otros tickets habían dejado abiertos:

- **`supabase_fix_super_admin_remaining_policies.sql`** (fix pre-existente, 2026-08-19, tocaba 6 tablas de 3 dominios) — a este archivo le faltaba la policy de `category_affinity_rules` (extraída acá). Con esto, sus partes de `product_stock`/`stock_movement_log` (#83), `combo_components` (#18/#86), `clients` (#88) y `product_price_history` (#84) ya estaban todas resueltas — archivo archivado completo.
- **`supabase_multitenant_schema_expand.sql`** (#10, creación de `stores` + `store_id` en las 13 tablas de negocio) — a este archivo le faltaban las líneas de `product_affinity`/`category_affinity_rules` en su checklist. Con las 14 tachadas, el archivo queda completamente extraído — archivado completo, cierra la migración de `supabase/` a `supabase/schema/`.

`supabase_recommendations.sql` y sus dos fixes (`_fix.sql`, `_fix2.sql`), `supabase_category_affinity.sql` (nunca aplicado, ver arriba), `supabase_consultas_afinidad.sql` (solo queries de ejemplo, ningún objeto propio), `supabase_export_productos_fn.sql`, `supabase_export_ventas.sql` (query cruda sin parametrizar, superseded) y `supabase_export_ventas_fn.sql` se archivaron completos — todos propios de este dominio.

## Gaps conocidos, no corregidos acá

- `get_recommendations()` (lectura pública, `/api/recommendations`) no está scoped por Store — fuera de alcance de #21, que solo scopea el recálculo (`refresh_product_affinity`) y los exports admin. Hasta que un ticket futuro la scope, las recomendaciones del catálogo público pueden mezclar el affinity score de distintas Stores.
- `category_affinity_rules` no tiene UI de CRUD — se sigue gestionando a mano en el SQL Editor. La policy de escritura ya quedó scoped por Store en #21, pero sin una ruta admin que la use, es un gap "en el papel" hasta que exista esa UI.
