-- effective_price(products) — punto único de lectura del Precio (#179, ticket 1)
--
-- Devuelve el Precio que se le cobra al comprador por una unidad de venta del
-- producto. Hoy es el precio manual (`products.price`); más adelante el cuerpo
-- puede pasar a calcularlo por fórmula (porcentaje sobre costo, utilidad
-- deseada, ajuste por categoría) sin tocar a ninguno de sus consumidores.
--
-- Qué lee esta función y qué NO:
--   - Los consumidores que VENDEN o REPORTAN (catálogo, ranking, exports,
--     stock, cálculo de unit_cost de un ítem) piden este valor.
--   - Quien EDITA el precio manual (formulario de producto, ProductService) lee
--     y escribe `products.price` directo: es el dato de entrada, no el precio
--     efectivo.
--   - `log_price_change()` y `sync_order_items_unit_cost()` reaccionan a un
--     cambio del precio MANUAL escrito (NEW.price vs OLD.price), por eso siguen
--     mirando la columna.
--
-- Se declara como columna calculada de PostgREST: toma la fila de `products` y
-- se pide con `select=...,effective_price` (o con alias, `price:effective_price`,
-- para que el consumidor no cambie su forma).
--
-- SECURITY INVOKER a propósito: corre con los privilegios de quien consulta, así
-- RLS sigue decidiendo qué filas ve cada uno (el visitante anónimo solo ve
-- productos activos). Por eso necesita EXECUTE para anon: el catálogo público
-- la usa (ver "Permisos de ejecución de funciones" en
-- docs/agents/schema-changes.md).
--
-- `SET search_path = public` es regla del repo para toda función (advisor
-- function_search_path_mutable). Efecto conocido: una función con SET no se
-- inlinea en la consulta, queda como una llamada por fila — para el volumen del
-- catálogo (cientos de filas) es irrelevante.

CREATE OR REPLACE FUNCTION public.effective_price(p public.products)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.price;
$$;

REVOKE EXECUTE ON FUNCTION public.effective_price(public.products) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_price(public.products) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
