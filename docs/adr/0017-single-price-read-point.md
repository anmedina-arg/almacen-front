---
status: accepted (2026-11-24; implementado en #180, aplicado en producción)
---

# El Precio se lee por un único punto: `effective_price`

Todo lo que vende o reporta el Precio de un Producto lo pide a `effective_price(products)`, una función SQL expuesta como columna calculada de PostgREST, y no lee `products.price` directo. Hoy devuelve el precio manual del Producto, así que el cambio no tuvo ninguna diferencia observable. Existe para que más adelante el cuerpo pueda calcular el Precio por fórmula (porcentaje sobre el Costo, utilidad deseada, ajuste por categoría o subcategoría) sin tocar a ninguno de sus consumidores. Las fórmulas están fuera de alcance de la spec #179.

El Precio sigue siendo núcleo siempre encendido, atado al Producto, no flageable ([ADR-0012](./0012-feature-flags-mutual-independence.md)). Esta decisión no cambia dónde vive el dato, solo por dónde se lo lee.

## Por qué

Antes de #180 el Precio se leía de `products.price` en varios lugares: creación de pedidos, catálogo público, combos, ranking, los exports de recomendaciones y ventas, y las RPC de stock. Si el Precio pasara a calcularse, habría que cambiarlos todos a la vez y cualquiera que quedara afuera mostraría un precio distinto al que se cobra. Con un punto único, la fórmula se cambia en un solo cuerpo de función y todos los consumidores la heredan.

## Considered Options

- **Una vista o una columna materializada con el precio efectivo.** Descartado: obliga a mantener la columna sincronizada ante cada cambio de Costo o de fórmula, y duplica el dato que hoy es una sola columna.
- **Un helper solo en la capa de servicios de TypeScript.** Descartado: las RPC de SQL (ranking, exports, stock, `create_order`) calculan Precio sin pasar por TypeScript, así que quedarían como segunda fuente de verdad.
- **Dejar la lectura directa y resolver las fórmulas cuando lleguen.** Descartado: el costo de migrar todos los consumidores después, bajo presión, es mayor que hacerlo ahora sin cambio de comportamiento.

## Consequences

- **Quién lee y quién escribe:** los consumidores que venden o reportan piden `effective_price`. Quien edita el precio manual (formulario de producto, `ProductService`) lee y escribe `products.price`, porque es el dato de entrada, no el precio efectivo. `log_price_change()` y `sync_order_items_unit_cost()` reaccionan al cambio del precio manual escrito, por eso siguen mirando la columna. El historial de cambios de precio se mantiene.
- **Desde TypeScript** se pide con alias, `price:effective_price`, para que el consumidor no cambie su forma.
- **`SECURITY INVOKER` con `SET search_path = public`:** corre con los privilegios de quien consulta, así RLS sigue decidiendo qué filas ve cada uno. El `search_path` fijo impide que Postgres la inline, de modo que se evalúa por fila. Con el volumen actual (cientos de productos por Store) el costo es despreciable.
- **Necesita `EXECUTE` para `anon`:** el catálogo público la usa. Pasó a ser la octava función pública para anónimos y figura en `docs/agents/schema-changes.md`.
- **Orden de despliegue:** primero el SQL en producción y después el código que la pide. Al revés, PostgREST responde `column products.effective_price does not exist`.
- **Regla para código nuevo:** un consumidor nuevo que venda o reporte el Precio tiene que pedir `effective_price`. Leer `products.price` directo desde ahí reintroduce el problema que esta decisión evita.
