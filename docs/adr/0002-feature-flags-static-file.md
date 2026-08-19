> **Superseded by [ADR-0007](./0007-feature-flags-db-column.md)** — el archivo estático nunca se conectó (scaffold sin usar); al retomar el ticket #23 se optó por una columna DB en su lugar.

# Feature flags: archivo estático por Store, no tabla en DB

Se evaluó un archivo de configuración por Store versionado en el repo (retoma el patrón ya scaffoldeado pero nunca conectado en `src/config/instance.config.json`) contra una tabla `feature_flags` en Supabase con `store_id` (propuesta original en `STACK_ANALYSIS.md`, togglable en runtime sin deploy). Se optó por el archivo estático para esta etapa: es lo que el negocio necesita ahora (activar/desactivar features por Store al onboardear un cliente minimalista), no requiere tabla ni RLS nueva, y no bloquea una migración futura a DB si la cantidad de Stores crece — la forma de los datos (`{ catalog: true, orders: false, ... }`) se mantiene igual, solo cambia de dónde se lee.

## Consequences

Activar un flag nuevo para una Store requiere un commit + redeploy de la plataforma completa (single-tenant deployment compartido, ver ADR-0001) — no hay instancia separada por cliente para deployar de forma aislada. Con pocas Stores esto es manejable; si la plataforma escala a decenas de tenants, este ADR debería revisarse a favor de un modelo DB-driven que permita toggles sin deploy.
