---
status: accepted (2026-10-30; implementación en #157 — el pedido ya no se rechaza desde #160, falta la edición en #161)
---

# El Control de stock lleva la cuenta, no impide ventas

Con la flag `stock` prendida, `create_order()` rechazaba el pedido entero si un ítem pedía más de lo que había en `product_stock`. El pedido no quedaba registrado, pero el comprador ya había mandado el mensaje por WhatsApp, porque se abre antes de que el servidor responda por la restricción de popups de iOS. El resultado era un pedido real que el almacenero atendía por WhatsApp y que no existía en ventas, stock ni reportes. Decidimos que **un faltante nunca impide registrar el pedido**: el Descuento de stock descuenta igual y el stock puede quedar **negativo**. El almacenero, que confirma cada pedido y conoce el estante, resuelve el faltante por WhatsApp ("recién vendí el último") y edita el pedido.

El stock negativo no es un bug. Es la señal de que la cuenta de la base no coincide con el estante.

## Por qué

En producción los rechazos casi nunca fueron carreras entre dos compradores; la carrera a nivel de datos ya estaba resuelta con lock. Fueron desacuerdos entre lo que el catálogo mostraba y lo que el servidor decidía: productos sin fila de stock que el catálogo daba por disponibles, combos sin stock calculado en el catálogo, y stock desactualizado (reposición no cargada, cancelaciones que no devolvieron bien). Un número de la base que puede estar mal no debería poder rechazar a un cliente real. Una Store contrata Control de stock para saber qué tiene, no para que el sistema le pierda pedidos.

## Considered Options

- **Rechazo duro con aviso previo al comprador.** Descartado: no se puede esperar la respuesta del servidor antes de abrir WhatsApp sin romper iOS, y el comprador no vuelve a la app después de mandar el mensaje.
- **Comportamiento configurable por Store.** Descartado: agrega una variante más del flujo de pedidos sin un caso real que la pida.

## Consequences

- La regla vale para todo el ciclo del pedido: pedidos del catálogo, ventas por POS y ediciones del Store admin. Ninguna rechaza por stock.
- El ítem que pide más de lo Disponible queda con **Faltante** (ver CONTEXT.md), visible solo en el admin: marca en la lista de Pedidos y detalle por ítem. El mensaje de WhatsApp no cambia. Un pedido con Faltante se confirma normal.
- Un producto sin stock cargado tiene Disponible 0 y el catálogo lo muestra "Sin Stock". Un olvido de carga queda visible en vez de vender sin descontar. Esto absorbe #130.
- Los fallos de `create_order()` que no son de stock (red, servidor, datos inválidos) no tienen UI para el comprador, que no vuelve a la app. El Store admin los detecta al no encontrar el pedido del WhatsApp en Pedidos y lo carga por POS.
- El catálogo y la confirmación usan una sola definición de **Disponible** (ver CONTEXT.md), que incluye el stock calculado de los combos. Un stock negativo da Disponible 0, así que el catálogo muestra "Sin Stock" después de esa venta.
- Sin Control de stock (flag apagada) nada cambia respecto de [ADR-0012](./0012-feature-flags-mutual-independence.md) y #97: ni el catálogo ni la confirmación miran el stock, aunque queden filas viejas en `product_stock`.
- Cómo se detecta y se reconcilia un producto con stock negativo queda abierto en #156.
- Reportes que usan stock (valor de stock al costo, rotación) pueden recibir valores negativos; #156 decide cómo tratarlos.
