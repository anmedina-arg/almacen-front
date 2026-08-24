# Dominio: Clients

El más chico y autocontenido de todos. Identifica clientes por lote
(barrio + manzana_lote) o como "otros" con nota libre. Consolidado en #88
(spec #81, mapa #74); scoping por Store en #19.

## Tablas

| Archivo | Qué es |
|---|---|
| `clients.sql` | Ver la nota de "lógica de otros" en su propio header — dos índices únicos parciales controlan la unicidad de lotes estructurados (AC1/AC2) y del "otros" catch-all sin descripción; los "otros" con descripción libre no tienen restricción de unicidad entre sí, a propósito. Policy: una sola `FOR ALL`, scoped por Store vía `is_store_admin()` — desde #19 con `WITH CHECK` (antes no tenía ninguno). |

## Funciones RPC (las que llama la API)

Ninguna en este dominio.

## Funciones trigger (no se llaman directo)

Ninguna en este dominio.

## Archivos compartidos — ya resueltos

Este ticket cerró dos archivos que habían quedado abiertos en tickets anteriores esperando la parte de Clients:

- **`supabase_store_scoping_orders.sql`** (#16) — Orders (#84) ya había extraído sus policies de `orders`/`order_items`/`order_payments`; a este archivo le faltaban los índices únicos `clients_unique_lot`/`clients_unique_otros_sin_desc` scoped por Store, que #88 extrajo acá. Archivado completo.
- **`supabase_fix_super_admin_remaining_policies.sql`** (fix pre-existente, 2026-08-19) — a este archivo le faltaba la policy de `clients` (extraída acá). Sigue vivo, sin archivar — todavía le falta `category_affinity_rules` (Recomendaciones, #90).

`supabase_clients.sql` y `supabase_clients_otros_description.sql` (los propios de este dominio) se archivaron completos.

## Gaps conocidos, no corregidos acá

Ninguno — el único gap que este dominio tenía documentado (scoping por Store de `clients`) se resolvió en #19.
