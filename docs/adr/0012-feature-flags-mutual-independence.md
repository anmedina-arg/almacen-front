# Feature flags: cada una debe ser mutuamente independiente

Las 8 feature flags (`stock`, `combos`, `clientes`, `pagos`, `ranking`, `pos`, `dashboard`, `informes` — ver ADR-0007 para dónde viven) existen para vender suscripciones por módulo: un Store puede pagar solo por "tomar pedidos", y otro puede sumar "control de stock" como módulo aparte. Este modelo de negocio exige que **apagar una flag nunca rompa ni degrade otra flag, ni ninguna de las capacidades siempre-encendidas** (catálogo, productos, pedidos/WhatsApp, ventas) — si una feature apagada pudiera romper otra, esa otra ya no sería vendible de forma independiente, y el modelo de suscripciones por módulo deja de tener sentido.

## El problema real que evidenció esto

`create_order()` (y las funciones que ajustan `product_stock` durante el ciclo de vida de una orden — confirmación, cancelación, edición de cantidad, borrado de ítem) chequeaban y descontaban stock de forma incondicional, sin importar si la flag `stock` estaba prendida para esa Store. Un Store con `stock: false` (que gestiona su inventario en otro sistema, y para el cual esta app nunca crea filas en `product_stock`) no podía crear pedidos: toda venta se rechazaba como `insufficient_stock`. Pedidos/WhatsApp es una capacidad siempre-encendida — su funcionamiento nunca debería depender del estado de una flag.

La corrección (issue #97) agrega `is_stock_tracked(p_store_id)` — una función SQL dedicada que resuelve `stores.feature_flags->>'stock'` — y la usan las 4 funciones de ciclo de vida de la orden que tocan `product_stock`. Con `stock: false`, ninguna de las 4 chequea ni toca stock: todo producto (combo o no) se trata como siempre disponible.

## Consequences

- **Regla general para features nuevas o existentes**: antes de dar por completa una capacidad gateada por flag, verificar explícitamente que ninguna otra flag ni ninguna capacidad siempre-encendida dependa de ella sin querer. Ver el checklist en `docs/agents/feature-flags.md`.
- **Patrón técnico establecido**: cuando una regla de negocio de una flag necesita aplicarse desde código compartido entre varios dominios (como el chequeo de stock, usado desde Orders), se resuelve con una función SQL dedicada y específica (`is_stock_tracked`, no una función genérica "chequear cualquier flag") — mismo criterio que `is_store_admin()` para autorización. Se crea una función nueva por cada regla real que lo necesite, no una de antemano.
- **Abre dos preguntas de diseño, deliberadamente sin resolver acá** (grilling sessions futuras, no parte de este ADR):
  - `combos` hoy es una flag, pero conceptualmente es una capacidad de composición del catálogo (como Producto Surtido, que nunca fue flag — ver CONTEXT.md, son conceptos técnicamente distintos entre sí, pero ninguno de los dos es un módulo de suscripción) — candidato a dejar de ser flag y pasar a ser siempre-encendida, parte de "productos". **Resuelto en [ADR-0013](./0013-service-layer-domain-boundaries.md)**: sí, se retira como flag.
  - `dashboard` hoy muestra widgets de varias fuentes (pedidos, pagos, stock) sin chequear si esas flags están prendidas — candidato a convertirse en una flag "compuesta", que solo muestre información de las flags activas en cada Store.
