-- import_products(store, filas) — creación transaccional de la Importación
-- masiva (#179, ticket #185)
--
-- Crea, en UNA transacción, los Productos de una Importación masiva y las
-- categorías y subcategorías nuevas que esos productos necesitan. Todas o
-- ninguna: el cuerpo de una función plpgsql corre dentro de la transacción del
-- request, así que cualquier error (un CHECK, una fila inválida) deshace
-- también las categorías creadas por filas anteriores.
--
-- #188 (spec #179): columnas de módulos. `cost` (módulo `costos`) va a product_costs y
-- `initial_stock` (módulo `stock`) a product_stock, en la misma transacción que el
-- producto. Cada una se guarda solo si la Store tiene su módulo (is_costs_enabled /
-- is_stock_tracked): con el módulo apagado la fila las trae igual y se ignoran, así la
-- base no depende de que la capa de servicios haya filtrado. `null` = sin costo
-- registrado / sin stock cargado; un 0 explícito sí se guarda. Misma firma que antes,
-- no hace falta DROP.
--
-- Entrada `p_rows`: arreglo JSON, una entrada por Producto:
--   { name, category_name, subcategory_name | null, sale_type, price, image,
--     active, cost | null, initial_stock | null }
-- Los nombres de categoría y subcategoría llegan ya resueltos contra la Store
-- por la capa de servicios (la que valida la planilla): se buscan por nombre
-- exacto y, si no existen, se crean. La función NO decide qué es "nuevo" ni
-- pide confirmación: eso lo hizo el Store admin en la vista previa.
--
-- SECURITY INVOKER a propósito: corre con la sesión del Store admin, así que
-- las policies de RLS de products, categories y subcategories (is_store_admin)
-- son la barrera real contra crear en una Store ajena. El chequeo explícito de
-- is_store_admin() de abajo solo da un error claro antes de intentar nada.
--
-- Devuelve { products_created, categories_created, subcategories_created }.
-- Máximo 500 filas, el mismo tope de la Plantilla de importación.

CREATE OR REPLACE FUNCTION public.import_products(p_store_id INTEGER, p_rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row                  JSONB;
  v_name                 TEXT;
  v_category_name        TEXT;
  v_subcategory_name     TEXT;
  v_price                NUMERIC;
  v_cost                 NUMERIC;
  v_initial_stock        NUMERIC;
  v_product_id           INTEGER;
  v_costs_enabled        BOOLEAN;
  v_stock_enabled        BOOLEAN;
  v_category_id          INTEGER;
  v_subcategory_id       INTEGER;
  v_products_created     INTEGER := 0;
  v_categories_created   INTEGER := 0;
  v_subcategories_created INTEGER := 0;
BEGIN
  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: no sos admin de esta Store' USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows debe ser un arreglo JSON' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Una importación admite hasta 500 filas' USING ERRCODE = '22023';
  END IF;

  v_costs_enabled := public.is_costs_enabled(p_store_id);
  v_stock_enabled := public.is_stock_tracked(p_store_id);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_name             := btrim(v_row->>'name');
    v_category_name    := btrim(v_row->>'category_name');
    v_subcategory_name := NULLIF(btrim(COALESCE(v_row->>'subcategory_name', '')), '');
    v_price            := (v_row->>'price')::NUMERIC;
    v_cost             := CASE WHEN v_costs_enabled THEN (v_row->>'cost')::NUMERIC END;
    v_initial_stock    := CASE WHEN v_stock_enabled THEN (v_row->>'initial_stock')::NUMERIC END;

    IF v_name IS NULL OR v_name = '' THEN
      RAISE EXCEPTION 'Fila sin nombre' USING ERRCODE = '22023';
    END IF;
    IF v_category_name IS NULL OR v_category_name = '' THEN
      RAISE EXCEPTION 'Fila "%" sin categoría', v_name USING ERRCODE = '22023';
    END IF;
    IF v_price IS NULL OR v_price <= 0 THEN
      RAISE EXCEPTION 'Fila "%" con precio inválido', v_name USING ERRCODE = '22023';
    END IF;
    IF v_cost < 0 THEN
      RAISE EXCEPTION 'Fila "%" con costo inválido', v_name USING ERRCODE = '22023';
    END IF;
    IF v_initial_stock < 0 THEN
      RAISE EXCEPTION 'Fila "%" con stock inicial inválido', v_name USING ERRCODE = '22023';
    END IF;

    -- Categoría: la de la Store con ese nombre, o una nueva al final de la lista.
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE store_id = p_store_id AND name = v_category_name;
    IF NOT FOUND THEN
      INSERT INTO public.categories (name, store_id, sort_order)
      VALUES (
        v_category_name,
        p_store_id,
        COALESCE((SELECT MAX(sort_order) FROM public.categories WHERE store_id = p_store_id), 0) + 1
      )
      RETURNING id INTO v_category_id;
      v_categories_created := v_categories_created + 1;
    END IF;

    -- Subcategoría (opcional), dentro de esa categoría.
    v_subcategory_id := NULL;
    IF v_subcategory_name IS NOT NULL THEN
      SELECT id INTO v_subcategory_id
      FROM public.subcategories
      WHERE category_id = v_category_id AND name = v_subcategory_name;
      IF NOT FOUND THEN
        INSERT INTO public.subcategories (name, category_id, store_id, sort_order)
        VALUES (
          v_subcategory_name,
          v_category_id,
          p_store_id,
          COALESCE((SELECT MAX(sort_order) FROM public.subcategories WHERE category_id = v_category_id), 0) + 1
        )
        RETURNING id INTO v_subcategory_id;
        v_subcategories_created := v_subcategories_created + 1;
      END IF;
    END IF;

    INSERT INTO public.products (name, price, image, active, sale_type, category_id, subcategory_id, store_id)
    VALUES (
      v_name,
      v_price,
      COALESCE(NULLIF(btrim(v_row->>'image'), ''), ''),
      COALESCE((v_row->>'active')::BOOLEAN, TRUE),
      COALESCE(NULLIF(v_row->>'sale_type', ''), 'unit'),
      v_category_id,
      v_subcategory_id,
      p_store_id
    )
    RETURNING id INTO v_product_id;
    v_products_created := v_products_created + 1;

    IF v_cost IS NOT NULL THEN
      INSERT INTO public.product_costs (product_id, store_id, cost) VALUES (v_product_id, p_store_id, v_cost);
    END IF;

    -- updated_by: el trigger de carga inicial lo copia al historial de movimientos (NOT NULL), así que
    -- un stock inicial mayor a 0 necesita una sesión de usuario: con service_role (auth.uid() NULL) falla.
    IF v_initial_stock IS NOT NULL THEN
      INSERT INTO public.product_stock (product_id, store_id, quantity, updated_by)
      VALUES (v_product_id, p_store_id, v_initial_stock, auth.uid());
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'products_created', v_products_created,
    'categories_created', v_categories_created,
    'subcategories_created', v_subcategories_created
  );
END;
$$;

-- Función de admin: no es pública (ver "Permisos de ejecución de funciones" en
-- docs/agents/schema-changes.md). Nace sin EXECUTE para anon por los privilegios
-- por defecto (#154); el REVOKE queda explícito igual que en las demás RPC de admin.
REVOKE EXECUTE ON FUNCTION public.import_products(INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_products(INTEGER, JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
