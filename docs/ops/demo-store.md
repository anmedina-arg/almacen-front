# Demo Store: alta y contenido

La **Demo Store** (#153, término en `CONTEXT.md`) es la Store de muestra que la landing ofrece en `/demo`: productos reales de Market del Cevil con precios de ejemplo, número de WhatsApp propio, marcada con `stores.is_demo = true`. Esa marca es lo único que la saca de `/stores`, del `sitemap.xml` y de la tabla de `/admin`, y lo que hace que su catálogo muestre la franja "Tienda de demostración · precios de ejemplo".

## En la base local (Docker)

No hay nada que hacer: `npm run db:reset` la deja lista. `supabase/seed.sql` inserta la Store (con un número de WhatsApp de ejemplo y membership del admin de plataforma) y `supabase/seed/demo-store.sql` carga categorías, productos y el Combo. `src/test/integration/demo-store-seed.test.ts` verifica ese estado.

## En producción (una sola vez, en este orden)

1. **Schema** (paso 6-8 de `docs/agents/schema-changes.md`), antes de desplegar el código:
   - `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;` y el `COMMENT ON COLUMN` del canónico `supabase/schema/store/stores.sql`.
   - `DROP FUNCTION public.provision_store(text, text, uuid, text, jsonb);` y después el `CREATE` de `supabase/schema/store/provision_store.sql` (la firma gana `p_is_demo`; si quedaran las dos, PostgREST no podría elegir entre las sobrecargas). Firma vieja verificada contra producción en #152 (definición idéntica al canónico).
   - `CREATE OR REPLACE` de `supabase/schema/store/get_orders_count_by_store.sql` (filtra `is_demo`).
   - `NOTIFY pgrst, 'reload schema';`
2. **Deploy** del código de `main`. Con la columna en `false` para todas las Stores, el código viejo y el nuevo conviven sin romper nada.
3. **Alta de la Store**, recién cuando el código que la excluye de `/stores` y del sitemap ya está desplegado (si no, aparecería como un cliente real). `/demo` resuelve la Demo Store por `is_demo` en cada request, así que no hace falta otro deploy después del alta:
   ```bash
   npx tsx scripts/provision-store.ts \
     --slug=demo-store --name="Demo Store" \
     --owner-email=<email del Platform admin> --operator-email=<el mismo> \
     --whatsapp=<número propio de la demo, con código de país, sin +> \
     --flags=clientes,pagos,ranking,pos,dashboard,informes --demo
   ```
   El número es distinto al de Market del Cevil y no se escribe en el repo. El flag `stock` va **apagado** a propósito: el control de stock es por Store (`is_stock_tracked()` lee `feature_flags->>'stock'`) y la demo no tiene filas en `product_stock`; con el flag prendido, `reserve_order_stock()` rechazaría todos los pedidos con `insufficient_stock`. Si algún día se quiere mostrar el módulo de stock en la demo, hay que cargar stock para cada producto antes de prender el flag.
4. **Contenido**: pegar `supabase/seed/demo-store.sql` entero en el SQL Editor (un solo bloque `DO`, un solo Run). Es idempotente: correrlo dos veces no duplica nada. No crea filas en `product_stock` (ver el punto anterior).
5. **Verificar**: `/demo` muestra el marco con el catálogo y la franja de demo; `/stores` y `/sitemap.xml` no listan `demo-store`; `/admin` no la cuenta.

## Mantenimiento

- Para cambiar productos o precios de la demo: editar `supabase/seed/demo-store.sql` y volver a correrlo. Solo agrega lo que falta (identifica por nombre dentro de la Store); para quitar o renombrar un producto hay que hacerlo a mano o desde `/demo-store/admin`.
- Las imágenes son las mismas URLs del bucket de Market del Cevil (decisión del spec #153, no se duplican archivos). Si una foto desaparece de la demo, Cevil reemplazó esa imagen: actualizar la URL en el seed.
- Los pedidos de la demo persisten en `orders` scoped a la Demo Store. No hay limpieza automática (fuera de alcance en #153).
- Si hubiera más de una Store con `is_demo = true`, `/demo` muestra la más antigua. No hay constraint que lo impida: los tests de integración siembran Stores demo descartables junto a la del seed.
- En el host legacy `market-del-cevil.vercel.app` la demo no funciona: ese host redirige cualquier slug que no sea Market del Cevil (ver `src/middleware.ts`), igual que le pasa a cualquier otra Store. La landing y la demo viven en `chaskyapp.vercel.app`.
