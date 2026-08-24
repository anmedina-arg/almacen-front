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

**Variedad**:
Una opción elegible entre las que se puede componer un Producto Surtido (ej. sabor de helado "Chocolate", tipo de masa "Bombón de dulce de leche"). Es una etiqueta administrable, sin precio ni stock propio — no es una fila de `products`.
_Avoid_: Sabor (válido solo como ejemplo dentro del dominio helados, no como término canónico — el modelo tiene que servir también para masas y futuros casos), variante, opción (a secas).

**Familia** (de Productos Surtidos):
Un grupo de Productos Surtidos definido por el admin de la Store que comparte una misma lista de Variedades (ej. la Familia "Helado" agrupa los productos "Helado 1/4kg", "Helado 1/2kg" y "Helado 1kg"; la Familia "Masas" agrupa "Masas 1/2kg" y "Masas 2kg"). Solo pueden pertenecer a una Familia productos que sean Producto Surtido. Deshabilitar una Variedad la saca de elección para toda la Familia a la que pertenece. Una Variedad pertenece a una sola Familia.
_Avoid_: Familia de Variedades (la Familia agrupa Productos Surtidos; las Variedades son un atributo compartido de esa agrupación, no lo que se agrupa).

**Producto Surtido**:
Un producto normal de `products` que, en vez de venderse tal cual, se arma eligiendo un número de Variedades de su Familia entre un mínimo y un máximo, ambos configurables por producto, sin que el precio cambie según qué Variedades se elijan. Distinto de un Combo: un Combo es una composición fija de otros productos con cantidad fija por componente; un Producto Surtido es una composición que elige el comprador al momento del pedido, entre opciones que son etiquetas, no productos.
_Avoid_: Combo (concepto ya usado en el código para composición fija — ver `is_combo`/`combo_components`, no confundir).

## Deployment model

Un único deployment comparte todas las Stores — no hay una instancia/infraestructura separada por cliente. El middleware resuelve la Store activa según el primer segmento del path de la URL (no hay dominio propio todavía, ver [ADR-0003](./docs/adr/0003-path-based-tenant-resolution.md)) e inyecta el slug como header para que los endpoints de API filtren por Store.
