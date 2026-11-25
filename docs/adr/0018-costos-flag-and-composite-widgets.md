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
- **Regla general para widgets compuestos:** cada widget declara las flags de las que depende y se muestra con todas encendidas. Ninguna combinación de flags apagadas puede dejarlo roto ni mostrando datos parciales sin aviso.
- La Plantilla de importación suma la columna de costo solo con `costos` encendida (#188), y la validación deja de tratar `costo` como columna ignorada para esas Stores.
