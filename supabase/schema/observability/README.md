# Dominio: Observability

Instrumentación temporal de performance para el spec #139 — sin relación
con el negocio, solo timing de rutas de código para medir antes/después de
cada fix. Consolidado en #141.

## Tablas

| Archivo | Qué es |
|---|---|
| `perf_logs.sql` | Duración (ms) de una ejecución de una ruta instrumentada (`route`), con `store_id` opcional y `created_at` para comparar rangos de fechas. RLS: INSERT abierto a cualquier rol (incluido `anon`, porque el catálogo público lo usa), sin policy de SELECT — solo `service_role` puede leer. `route` limitado a un `CHECK` con las rutas instrumentadas hoy (`catalog_ssr`, `catalog_search`, `catalog_category_pagination`, `catalog_admin_fetch`, `admin_layout_guard`, `admin_api_guard`, `public_api_route`) y `duration_ms` acotado a un rango razonable — defensa en profundidad contra inserts arbitrarios vía la anon key pública, no autenticación. |

## Funciones RPC (las que llama la API)

Ninguna en este dominio — se escribe con `INSERT` directo desde
`src/lib/observability/logPerf.ts`, no vía RPC.

## Funciones trigger (no se llaman directo)

Ninguna en este dominio.

## Gaps conocidos, no corregidos acá

- Es instrumentación temporal, no pensada para vivir para siempre — no tiene
  política de retención/limpieza automática. Si el spec #139 tarda mucho en
  cerrar, `perf_logs` puede crecer sin límite; borrar filas viejas a mano si
  hace falta, o dropear la tabla entera cuando la remediación cierre.
