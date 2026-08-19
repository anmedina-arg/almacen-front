# Feature flags por Store: columna DB, no archivo estático (supersede ADR-0002)

ADR-0002 había optado por un archivo estático versionado en el repo, con el argumento de que activar un flag no requería tabla ni RLS nueva. Al retomar el ticket (#23) se hizo explícito un costo que ADR-0002 no había puesto a discusión: con un único deployment compartido por todas las Stores (ADR-0001), cualquier cambio a un archivo en el repo implica un commit + redeploy de la plataforma entera, no solo de la Store afectada — un riesgo distinto al de una instalación dedicada por cliente, que es el patrón del que venía la idea del archivo. Se optó por una columna `feature_flags JSONB NOT NULL DEFAULT '{}'` en la tabla `stores` existente en su lugar: mismo shape de datos que ya había validado ADR-0002, migración aditiva (sin tabla ni RLS nueva — hereda la policy de lectura pública de `stores` del #12), y editable sin redeploy.

## Consequences

Cada key del jsonb es requerida — omitirla es un estado inválido, no "apagada por default" (a diferencia del criterio de ADR-0002, que no lo especificaba). La escritura sigue siendo manual vía SQL Editor por ahora (mismo patrón que el resto del alta de Stores, ver ADR-0006); una UI de super-admin para editar flags de una Store existente queda como ticket aparte, no parte de este cambio.
