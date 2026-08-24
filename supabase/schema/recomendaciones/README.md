# Dominio: Recomendaciones/Informes

Afinidad de productos/categorías (sugerencias del catálogo) y las
funciones de export que respaldan la página "Informes" — una sola feature
flag que agrupa reportes CSV + recomendaciones (ver `CONTEXT.md`).
Consolidado en #90 (spec #81, mapa #74). Prepara terreno para #21 (Scoping
por Store: POS/Dashboard/Informes/Recomendaciones). Último ticket del mapa
#74 — con este dominio, `supabase/` terminó su reorganización completa.

## Tablas

| Archivo | Qué es |
|---|---|
| `product_affinity.sql` | Matriz de afinidad producto-a-producto, recalculada por `refresh_product_affinity()`. Lectura pública sin restricción — la API de recomendaciones del catálogo es pública. |
| `category_affinity_rules.sql` | Reglas manuales de boost entre categorías, usadas como multiplicador dentro de `refresh_product_affinity()` — no como fuente directa de sugerencias, ver la nota en `get_recommendations.sql`. |

## Funciones RPC (las que llama la API)

| Archivo | Qué hace |
|---|---|
| `get_recommendations.sql` | Sugerencias para el carrito: afinidad histórica primero, completa con más vendidos globales. **Importante**: `supabase_category_affinity.sql` proponía una versión posterior (usa `category_affinity_rules` directamente, sin depender de co-ocurrencia) — verificado que esa versión nunca se aplicó en ningún entorno, a pesar de ser el archivo más nuevo por fecha. La vigente es la de `supabase_recommendations_fix.sql`. |
| `refresh_product_affinity.sql` | Recalcula `product_affinity` desde cero. Se llama manualmente desde `/admin/informes`. |
| `export_productos.sql` | Catálogo completo con costo/margen/stock (virtual para combos) — CSV de "Informes". |
| `export_ventas.sql` | Detalle de ventas, una fila por ítem — CSV de "Informes". **Gap de entorno**: la versión en test no tiene la columna `desde_sugerencia` (firma más vieja que producción) — no corregido acá, ver Gaps abajo. |

## Funciones trigger (no se llaman directo)

Ninguna en este dominio.

## Archivos compartidos — ya resueltos

Este ticket fue el último en confirmar su parte de dos archivos que otros tickets habían dejado abiertos:

- **`supabase_fix_super_admin_remaining_policies.sql`** (fix pre-existente, 2026-08-19, tocaba 6 tablas de 3 dominios) — a este archivo le faltaba la policy de `category_affinity_rules` (extraída acá). Con esto, sus partes de `product_stock`/`stock_movement_log` (#83), `combo_components` (#18/#86), `clients` (#88) y `product_price_history` (#84) ya estaban todas resueltas — archivo archivado completo.
- **`supabase_multitenant_schema_expand.sql`** (#10, creación de `stores` + `store_id` en las 13 tablas de negocio) — a este archivo le faltaban las líneas de `product_affinity`/`category_affinity_rules` en su checklist. Con las 14 tachadas, el archivo queda completamente extraído — archivado completo, cierra la migración de `supabase/` a `supabase/schema/`.

`supabase_recommendations.sql` y sus dos fixes (`_fix.sql`, `_fix2.sql`), `supabase_category_affinity.sql` (nunca aplicado, ver arriba), `supabase_consultas_afinidad.sql` (solo queries de ejemplo, ningún objeto propio), `supabase_export_productos_fn.sql`, `supabase_export_ventas.sql` (query cruda sin parametrizar, superseded) y `supabase_export_ventas_fn.sql` se archivaron completos — todos propios de este dominio.

## Gaps conocidos, no corregidos acá

- Ninguna de las funciones está scoped por Store (sin `p_store_id`) — es exactamente lo que resuelve #21. No se adelanta acá.
- `export_ventas` en el proyecto de test tiene una firma más vieja que en producción (sin `desde_sugerencia`) — decisión explícita, consultada con el usuario: no tocar test en #90, mismo criterio que el trigger `on_auth_user_created` en #87.
