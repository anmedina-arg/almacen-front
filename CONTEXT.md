# Market Cevil

Catálogo de productos e-commerce con integración de pedidos por WhatsApp, evolucionando de una app de una sola tienda a una plataforma SaaS multi-tenant vendida a distintos comercios.

## Language

**Store**:
Un negocio cliente de la plataforma, con su propio catálogo, pedidos y configuración. Es el "tenant" del sistema — cada Store es dueña de sus propios datos y accede mediante un subdominio (y opcionalmente un dominio propio).
_Avoid_: Tenant (usar Store como término de dominio; "tenant" es aceptable solo al hablar de infraestructura/aislamiento de datos), cliente (ambiguo con "cliente" = comprador final del catálogo).

**Feature flag**:
Un interruptor que activa o desactiva una capacidad completa (stock, combos, ranking, clientes, pagos, POS, dashboard, informes) para una Store puntual. Catálogo, productos, pedidos/WhatsApp y ventas quedan siempre encendidos — son el núcleo, no son flageables. Permite ofrecer una versión minimalista de la plataforma a Stores que no necesitan el resto. Ver [ADR-0007](./docs/adr/0007-feature-flags-db-column.md).
_Avoid_: Instance config (nombre legado de un intento previo sin terminar, pensado para instalación dedicada por cliente — no aplica a este deployment compartido, ver "Deployment model" abajo).

**Informes**:
Página de admin (`/admin/informes`) que agrupa dos capacidades bajo una sola feature flag: descarga de reportes en CSV (ventas, catálogo de productos) y recálculo de recomendaciones de productos (afinidad). No están separadas porque no tienen ruta ni UI propia — si alguna vez se separan, ahí sí ameritan flags independientes.
_Avoid_: Reportes (término usado en algunos issues pero no en el código ni la UI shippeada — canonizar como "Informes").

**Store slug**:
Identificador único de una Store en la URL (ej. `market-del-cevil`). Es el primer segmento del path (`/market-del-cevil/...`) — hoy no hay subdominios propios, así que el slug reemplaza esa función.

**Platform**:
El producto en sí (aún sin nombre definitivo), distinto de cualquier Store individual. Vive en la raíz `/` como landing de marketing.

**Store admin**:
Un usuario con permiso para administrar una Store puntual (pedidos, stock, catálogo, etc. de esa Store solamente). Membresía explícita por Store, no un rol global.
_Avoid_: Admin a secas (ambiguo entre Store admin y Platform admin).

**Platform admin**:
El dueño de la plataforma (rol `super_admin`), con acceso a todas las Stores. No es un Store admin de ninguna Store en particular.

## Deployment model

Un único deployment comparte todas las Stores — no hay una instancia/infraestructura separada por cliente. El middleware resuelve la Store activa según el primer segmento del path de la URL (no hay dominio propio todavía, ver [ADR-0003](./docs/adr/0003-path-based-tenant-resolution.md)) e inyecta el slug como header para que los endpoints de API filtren por Store.
