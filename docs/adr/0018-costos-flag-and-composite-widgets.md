---
status: accepted (2026-11-24; decidido en la spec #179, implementación en #183, #186 y #187)
---

# `costos` es una flag única, y los widgets compuestos aparecen solo con todas sus flags

El Costo de un Producto pasa a ser un módulo propio, con **una sola flag `costos`**. Sin Costo no hay margen, así que no se parte en dos (costo por un lado, margen por otro). Extiende [ADR-0012](./0012-feature-flags-mutual-independence.md): apagar `costos` no puede romper pedidos, ventas, catálogo ni combos, y el Precio sigue siendo núcleo siempre encendido ([ADR-0017](./0017-single-price-read-point.md)).

Esta decisión también responde la segunda pregunta que ADR-0012 dejó abierta: un **widget compuesto** (que combina datos de varias flags) se muestra solo si **todas** las flags de las que depende están encendidas. El primero es el valor del stock al costo, que exige `stock` y `costos`: con cualquiera apagada desaparece.

## El problema real

Una Store que no contrató el módulo igual veía y cargaba el campo de costo en el formulario de producto, y la base lo guardaba en 0. Ese cero se leía después como "problema de datos" y como márgenes en "—" en Pedidos, Ventas, Ranking e Informes. Caso real: Yo Heladerías tenía 20 productos activos y 0 con costo.

## Reglas

- **Dónde vive el dato:** una tabla propia de costos por Producto, con una fila por producto y la Store dueña. Un costo ausente significa **"sin costo registrado"**, no cero.
- **Apagar no borra:** apagar `costos` nunca elimina costos cargados, y se recuperan al volver a encenderla.
- **Hacia adelante:** encender la flag impacta los pedidos nuevos, no los viejos. No hay backfill automático. El margen de un período con historia se calcula solo con los ítems que tienen Costo registrado y el resto se presenta como "sin costo". Al encender la flag en una Store con pedidos previos se muestra un aviso al admin.
- **El costo capturado en los ítems de pedido** (foto histórica) no se toca.
- **Servidor, no solo interfaz:** los endpoints exclusivos de costo se rechazan con la flag apagada, usando el helper de requerimiento de flag existente. Los endpoints mixtos (ranking, reportes, informes, dashboard, POS) omiten Costo y margen de la respuesta. Ocultarlos solo en la interfaz no alcanza.
- **Combos:** con `costos` apagada, el cálculo del costo del combo no corre y el combo no tiene fila de costo. Con ella encendida, el costo del combo se calcula a partir de sus componentes.
- **Formularios:** el campo de costo aparece solo con `costos`.

## Considered Options

- **Dos flags, una para el costo y otra para el margen.** Descartado: el margen no existe sin el costo, y la segunda flag solo agregaría una combinación inválida que ADR-0012 obligaría a verificar.
- **Dejar el Costo como campo del Producto, oculto por la interfaz.** Descartado: es lo que produjo los ceros. El dato seguiría en el Producto aunque la Store no tenga el módulo, y la API lo devolvería.
- **Costo cero por defecto.** Descartado: indistinguible de un costo real igual a cero, que es justamente lo que rompía los márgenes.
- **Backfill del costo en pedidos viejos al encender la flag.** Descartado: inventaría márgenes sobre ventas que se cobraron con otro costo.

## Consequences

- `costos` se agrega al catálogo de feature flags y se normaliza como las demás, y el checklist de `docs/agents/feature-flags.md` aplica a cada ticket que la toque.
- La migración es reversible y por pasos: crear la tabla, copiar los costos existentes desde el Producto, cambiar lecturas y escrituras, y recién al final borrar la columna vieja (ticket #189).
- **Espejo transitorio (#183) y su retiro (#189):** mientras #186 y #187 migraban a sus consumidores (pedidos, ranking, informes, dashboard, combos), la tabla `product_costs` fue la fuente de verdad y un trigger espejaba el costo a `products.cost`, para que los triggers y funciones que todavía leían esa columna siguieran funcionando. En #189 esos consumidores pasaron a leer `product_costs`, y la columna `products.cost` y el espejo se borraron junto con `products.max_stock` (vive en `product_stock`, #184) y la categoría legacy de texto libre. Se copiaron solo los costos mayores a cero: un 0 en la columna vieja era "sin costo registrado", no un costo.
- **El costo del ítem de pedido lo fija la base (#189):** un trigger en `order_items` toma el costo de `product_costs` normalizado por el precio al crear el ítem cuando este llega sin costo (la capa de servicios ya no lo manda). El checkout público crea pedidos con la sesión del visitante, que no puede leer el Costo, así que el cálculo no puede vivir en la capa de servicios. El historial de precios y la corrección de ítems sin costo pasaron a colgar de `product_costs`. Sin el módulo `costos`, la RPC del valor del stock al costo no devuelve filas.
- **El Costo deja de ser público:** `product_costs` solo lo ve y lo cambia el Store admin (RLS). El catálogo público ya no lo trae, y la lista de productos del admin lo suma aparte, solo con `costos` encendida.
- **Margen con historia (#186):** el margen de un pedido se calcula solo con los ítems que tienen Costo registrado (`unit_cost` mayor a 0 en el ítem). Un pedido sin ningún ítem con costo es "sin costo" y no tiene margen; uno con costo en algunos ítems es "parcial" y su margen es de esos ítems. Pedidos, ranking, informes descargables y el dashboard omiten costo y margen de la respuesta con la flag apagada; las RPC y el snapshot de `unit_cost` en los ítems siguen igual, la decisión se aplica al armar la respuesta. El valor del stock al costo del dashboard es de #187.
- **Combos y valor del stock al costo (#187):** `sync_combo_cost` corre solo con `costos` encendida (`is_costs_enabled()`, función dedicada como `is_stock_tracked()`); apagada, el combo no tiene fila de costo y una fila que ya existía queda como está. El valor del stock al costo del dashboard (capital en stock, stock valorizado por categoría y su detalle) exige `stock` y `costos`: las tres rutas piden las dos flags y el panel oculta los widgets sin ellas. La rotación depende solo de `stock`.
- **Regla general para widgets compuestos:** cada widget declara las flags de las que depende y se muestra con todas encendidas. Ninguna combinación de flags apagadas puede dejarlo roto ni mostrando datos parciales sin aviso.
- La Plantilla de importación suma la columna de costo solo con `costos` encendida (#188), y la validación deja de tratar `costo` como columna ignorada para esas Stores. Una celda de costo vacía es "sin costo registrado" (no se crea fila) y un 0 escrito a propósito se guarda como 0. La base también aplica la regla: `import_products` guarda el costo solo si la Store tiene `costos`, así que no depende de que la capa de servicios haya filtrado.
