-- ============================================================================
-- Contenido de la Demo Store (#153): categorías, productos y Combo.
-- ============================================================================
-- Qué es: datos, no schema. La Demo Store es una Store de muestra de la
-- Platform (ver CONTEXT.md, "Demo Store") con productos reales tomados de
-- los más pedidos de Market del Cevil (relevado en producción el
-- 2026-10-19) y precios REDONDEADOS DE EJEMPLO — no son los precios de
-- ninguna Store real. Las imágenes reutilizan las URLs públicas del bucket
-- `products` que ya usa Market del Cevil: no se copian archivos (riesgo
-- aceptado: si Cevil reemplaza una imagen, la demo pierde esa foto).
--
-- Precondición: la Store `demo-store` ya existe. En producción se da de alta
-- con `scripts/provision-store.ts --demo --whatsapp=...` (número propio de
-- la demo, nunca el de Cevil); en la base local la inserta supabase/seed.sql.
-- Este archivo NO crea la Store a propósito: el número de WhatsApp y el
-- dueño son decisiones del alta, no del contenido.
--
-- Idempotente: se puede volver a correr sin duplicar nada (categorías por
-- UNIQUE (store_id, name); productos y Combo por nombre dentro de la Store).
-- No crea filas en product_stock. El stock se controla por Store
-- (is_stock_tracked lee feature_flags->>'stock'), así que la Demo Store se
-- da de alta con el flag `stock` apagado: con él prendido y sin filas acá,
-- reserve_order_stock() rechazaría todo pedido con insufficient_stock.
--
-- Cómo aplicarlo en producción: pegar este archivo entero en el SQL Editor
-- (es un único bloque DO, así que va en un solo Run).
-- ============================================================================

DO $$
DECLARE
  v_store     INTEGER;
  v_gaseosas  INTEGER;
  v_snacks    INTEGER;
  v_hamb      INTEGER;
  v_combo     INTEGER;
  v_img       TEXT := 'https://ihmrrregqddtiyospypm.supabase.co/storage/v1/object/public/products/';
BEGIN
  SELECT id INTO v_store FROM public.stores WHERE slug = 'demo-store';
  IF v_store IS NULL THEN
    RAISE EXCEPTION 'La Store demo-store no existe: dala de alta primero (scripts/provision-store.ts --demo)';
  END IF;

  -- ── Categorías ─────────────────────────────────────────────────────────
  INSERT INTO public.categories (name, sort_order, store_id)
  VALUES ('Gaseosas', 1, v_store), ('Snacks', 2, v_store), ('Hamburguesas', 3, v_store)
  ON CONFLICT (store_id, name) DO NOTHING;

  SELECT id INTO v_gaseosas FROM public.categories WHERE store_id = v_store AND name = 'Gaseosas';
  SELECT id INTO v_snacks   FROM public.categories WHERE store_id = v_store AND name = 'Snacks';
  SELECT id INTO v_hamb     FROM public.categories WHERE store_id = v_store AND name = 'Hamburguesas';

  -- ── Gaseosas ───────────────────────────────────────────────────────────
  INSERT INTO public.products (name, price, cost, image, categories, category_id, store_id)
  SELECT v.name, v.price, v.cost, v_img || v.img, 'Gaseosas', v_gaseosas, v_store
  FROM (VALUES
    ('Coca Cola 2.25 L',        4500, 3400, 'coca-cola-coca-cola-thumbnail_j5ikdn.png'),
    ('Coca Cola Zero 2.25 L',   4500, 3400, 'cocazero_wnwiti.webp'),
    ('Coca Cola 1.5 L',         3500, 2600, 'coca-cola-coca-cola-thumbnail_j5ikdn.png'),
    ('Sprite 2.25 L',           4000, 3000, 'sprite_mjpppn.webp'),
    ('Fanta Naranja 2 L',       3500, 2600, 'fanta_hotw9i.webp'),
    ('Pepsi 2 L',               3200, 2400, 'pepsi_igudpw.jpg'),
    ('Pepsi Black 2 L',         3200, 2400, 'black_utktlz.webp'),
    ('7up 2 L',                 3000, 2200, '7up_yqcefo.jpg'),
    ('Mirinda Manzana 2 L',     3000, 2200, 'Mirinda_qacu7d.webp')
  ) AS v(name, price, cost, img)
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.store_id = v_store AND p.name = v.name);

  -- ── Snacks ─────────────────────────────────────────────────────────────
  INSERT INTO public.products (name, price, cost, image, categories, category_id, store_id)
  SELECT v.name, v.price, v.cost, v_img || v.img, 'Snacks', v_snacks, v_store
  FROM (VALUES
    ('Papas Lays Clásicas x 134 g',  5000, 3700, 'iowhb1hefkihvtcinpmu.webp'),
    ('Papas Lays Clásicas x 85 g',   3500, 2600, 'ffbprwd4w4akeqd9vsgt.jpg'),
    ('Doritos Queso x 129 g',        5000, 3700, 'Doritos-x-150gr_u3wxaj.jpg'),
    ('Doritos Queso x 77 g',         3500, 2600, 'Doritos-x-150gr_u3wxaj.jpg'),
    ('Cheetos Queso x 85 g',         3500, 2600, 'yfr1q06q7mntu2qmqlj2.webp'),
    ('3D Queso x 85 g',              3500, 2600, 'mkebyrvj0r3peevbspwy.jpg'),
    ('Takis Xplosion x 85 g',        3000, 2200, '1776872799137-9scn0opt5g8.webp'),
    ('Conitos Twister x 79 g',       2500, 1800, 'xzypjadftn6gveh6omsm.png'),
    ('Maní frito salado x 150 g',    2000, 1400, 'transparent-Photoroom__2_-removebg-preview_nmxjoz.png'),
    ('Palitos salados x 90 g',       1500, 1000, 'qcl2obd4rdu6xjcjflsx.jpg')
  ) AS v(name, price, cost, img)
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.store_id = v_store AND p.name = v.name);

  -- ── Hamburguesas ───────────────────────────────────────────────────────
  INSERT INTO public.products (name, price, cost, image, categories, category_id, store_id)
  SELECT v.name, v.price, v.cost, v_img || v.img, 'Hamburguesas', v_hamb, v_store
  FROM (VALUES
    ('Hamburguesas Swift Clásicas x 2',  3500, 2500, 'hamburguesa-clasica-swift-80-gr-x-2-un_d2ohqj.webp'),
    ('Hamburguesas Swift XL x 2',        5000, 3600, 'Swift-XL_imyowr.jpg'),
    ('Pan de hamburguesa Albertus x 4',  2000, 1300, 'hamburguesa-albertus_krvffo.webp')
  ) AS v(name, price, cost, img)
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.store_id = v_store AND p.name = v.name);

  -- ── Combo: 2 hamburguesas + pan + gaseosa ──────────────────────────────
  -- Muestra la composición fija del catálogo (is_combo + combo_components).
  -- El costo lo recalcula el trigger sync_combo_cost a partir de los
  -- componentes; el precio es de ejemplo, un poco menor que la suma.
  INSERT INTO public.products (name, price, image, categories, category_id, store_id, is_combo)
  SELECT 'Combo Hamburguesas para 2', 9500, v_img || 'hamburguesa-clasica-swift-80-gr-x-2-un_d2ohqj.webp',
         'Hamburguesas', v_hamb, v_store, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.store_id = v_store AND p.name = 'Combo Hamburguesas para 2'
  );

  SELECT id INTO v_combo FROM public.products WHERE store_id = v_store AND name = 'Combo Hamburguesas para 2';

  INSERT INTO public.combo_components (combo_product_id, component_product_id, quantity, store_id)
  SELECT v_combo, p.id, 1, v_store
  FROM public.products p
  WHERE p.store_id = v_store
    AND p.name IN ('Hamburguesas Swift Clásicas x 2', 'Pan de hamburguesa Albertus x 4', 'Coca Cola 2.25 L')
  ON CONFLICT (combo_product_id, component_product_id) DO NOTHING;
END $$;
