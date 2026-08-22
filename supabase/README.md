# `supabase/`

**Reorganización en curso.** Ver el mapa de decisiones [#74](https://github.com/anmedina-arg/almacen-front/issues/74) y el spec [#81](https://github.com/anmedina-arg/almacen-front/issues/81): esta carpeta está migrando de archivos `.sql` sueltos (uno por cambio histórico, con responsabilidades mezcladas y sin fuente única de verdad por objeto) a `supabase/schema/<dominio>/` — un archivo canónico por objeto (tabla, función, policy), agrupado por dominio de negocio.

## Estructura destino

- `supabase/schema/<dominio>/` — un archivo canónico por objeto de ese dominio. Dominios: `stock`, `orders`, `products`, `combos`, `store`, `clients`, `ranking`, `recomendaciones`.
- `supabase/backfills/` — scripts de backfill de datos (no de schema). Permanentes: a diferencia de un fix de schema, un backfill documenta una migración de datos puntual que puede necesitar reconsultarse.
- Los archivos `.sql` sueltos existentes en la raíz de `supabase/` se van consolidando a medida que cada ticket de dominio (#83-#90) extrae su parte. Antes de tocar cualquiera, seguir el flujo de [`docs/agents/schema-changes.md`](../docs/agents/schema-changes.md).

## Regla de retención de archivos (decidida en #77)

- **Fix de schema** (una función/policy que se reemplaza por una versión corregida): se descarta una vez aplicado y confirmado en producción — pero el commit que aplicó el fix al canónico debe referenciar el número de issue explícitamente, para poder rastrear la razón del cambio después de borrar el archivo separado.
- **Backfill de datos**: permanece en `supabase/backfills/` de forma indefinida.
- **`supabase/_archive/`**: se disuelve entre las dos categorías de arriba — no queda como carpeta propia una vez terminada la migración.

## Archivos compartidos entre dominios

Un archivo fuente que toca objetos de más de un dominio (el caso más grande: `supabase_multitenant_schema_expand.sql`, con 14 tablas) **no se descarta** hasta que **todos** los dominios que lo tocan confirmen que ya extrajeron su parte al canónico correspondiente. Ver el comentario-checklist al tope de ese archivo.
