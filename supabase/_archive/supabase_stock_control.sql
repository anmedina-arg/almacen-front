-- ============================================================================
-- MIGRACION: Sistema de Control de Stock Manual
-- Proyecto: Market Cevil (almacen-front)
-- Fecha: 2026-02-06
-- ============================================================================
-- Este script crea la infraestructura de base de datos para el control de
-- stock manual de productos. Diseñado como solucion inicial y evolutiva.
--
-- EJECUTAR EN: Supabase SQL Editor
-- PREREQUISITOS: Tablas 'products' y 'profiles' ya existentes
-- ============================================================================

-- ============================================================================
-- PARTE 1: TABLA PRINCIPAL - product_stock
-- ============================================================================
-- Esta tabla almacena el nivel de stock actual de cada producto.
-- Relacion 1:1 con products (un registro de stock por producto).
-- Diseñada para que desde la UI se introduzca la cantidad existente.

CREATE TABLE IF NOT EXISTS public.product_stock (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity      NUMERIC(12, 3) NOT NULL DEFAULT 0,
    -- NUMERIC(12,3) permite:
    --   - Hasta 999,999,999.999 unidades (suficiente para cualquier escala)
    --   - 3 decimales para productos que se venden por peso (ej: 2.500 kg)
    --   - Compatible con unidades enteras (ej: 15.000 = 15 unidades)
  min_stock     NUMERIC(12, 3) DEFAULT NULL,
    -- Umbral minimo opcional para alertas de stock bajo.
    -- NULL = sin alerta configurada. Se puede agregar despues.
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Quien realizo la ultima actualizacion.
    -- SET NULL si el usuario se elimina (preserva el registro).
  notes         TEXT DEFAULT NULL,
    -- Nota opcional de la ultima actualizacion manual.
    -- Ej: "Conteo fisico realizado", "Ajuste por merma".
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: un solo registro de stock por producto
  CONSTRAINT uq_product_stock_product_id UNIQUE (product_id),

  -- Constraint: la cantidad no puede ser negativa (control manual, no backorders)
  CONSTRAINT chk_product_stock_quantity CHECK (quantity >= 0),

  -- Constraint: min_stock debe ser positivo si se establece
  CONSTRAINT chk_product_stock_min_stock CHECK (min_stock IS NULL OR min_stock >= 0)
);

-- Comentarios de tabla y columnas para documentacion en Supabase
COMMENT ON TABLE public.product_stock IS 'Stock actual de cada producto. Control manual de inventario.';
COMMENT ON COLUMN public.product_stock.quantity IS 'Cantidad actual en stock. NUMERIC(12,3) para soportar unidades y pesos.';
COMMENT ON COLUMN public.product_stock.min_stock IS 'Umbral minimo para alertas de stock bajo. NULL = sin alerta.';
COMMENT ON COLUMN public.product_stock.updated_by IS 'UUID del admin que realizo la ultima actualizacion.';
COMMENT ON COLUMN public.product_stock.notes IS 'Nota opcional sobre la ultima actualizacion (ej: motivo del ajuste).';


-- ============================================================================
-- PARTE 2: TABLA DE HISTORIAL - stock_movement_log
-- ============================================================================
-- Registro inmutable de cada cambio de stock (auditoria).
-- Esta tabla SOLO recibe INSERTs, nunca UPDATE ni DELETE.
-- Permite reconstruir la historia completa de movimientos de un producto.

CREATE TABLE IF NOT EXISTS public.stock_movement_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL DEFAULT 'manual_adjustment',
    -- Tipos iniciales: 'manual_adjustment', 'initial_count'
    -- Tipos futuros posibles: 'sale', 'purchase', 'return', 'transfer', 'loss', 'correction'
  previous_qty    NUMERIC(12, 3) NOT NULL,
    -- Cantidad ANTES del movimiento
  new_qty         NUMERIC(12, 3) NOT NULL,
    -- Cantidad DESPUES del movimiento
  change_qty      NUMERIC(12, 3) GENERATED ALWAYS AS (new_qty - previous_qty) STORED,
    -- Diferencia calculada automaticamente (positiva = entrada, negativa = salida)
  performed_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Quien realizo el movimiento (obligatorio para auditoria)
  notes           TEXT DEFAULT NULL,
    -- Motivo o detalle del movimiento
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: tipo de movimiento debe ser uno de los validos
  CONSTRAINT chk_movement_type CHECK (
    movement_type IN (
      'manual_adjustment',  -- Ajuste manual de cantidad
      'initial_count',      -- Conteo inicial / primera carga
      'correction',         -- Correccion de error
      'loss',               -- Perdida / merma
      'sale',               -- Venta (uso futuro)
      'purchase',           -- Compra / reposicion (uso futuro)
      'return'              -- Devolucion (uso futuro)
    )
  )
);

COMMENT ON TABLE public.stock_movement_log IS 'Historial inmutable de movimientos de stock. Solo INSERT, nunca UPDATE/DELETE.';
COMMENT ON COLUMN public.stock_movement_log.movement_type IS 'Tipo de movimiento. Iniciales: manual_adjustment, initial_count.';
COMMENT ON COLUMN public.stock_movement_log.change_qty IS 'Columna calculada: new_qty - previous_qty. Positivo=entrada, Negativo=salida.';


-- ============================================================================
-- PARTE 3: INDICES
-- ============================================================================

-- Indice principal: buscar stock por producto (ya cubierto por UNIQUE, pero explicito)
-- El constraint UNIQUE ya crea un indice, pero lo documentamos
-- CREATE INDEX IF NOT EXISTS idx_product_stock_product_id ON public.product_stock(product_id);
-- ^ No necesario: el UNIQUE constraint ya genera este indice

-- Indice: productos con stock bajo (para la query de alertas)
CREATE INDEX IF NOT EXISTS idx_product_stock_low_stock
  ON public.product_stock(quantity, min_stock)
  WHERE min_stock IS NOT NULL;

-- Indice: historial por producto (consulta mas frecuente del log)
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_product_id
  ON public.stock_movement_log(product_id);

-- Indice: historial por fecha (para reportes temporales)
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_created_at
  ON public.stock_movement_log(created_at DESC);

-- Indice: historial por producto + fecha (para historial de un producto especifico)
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_product_date
  ON public.stock_movement_log(product_id, created_at DESC);

-- Indice: historial por tipo de movimiento (para filtrar por tipo)
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_type
  ON public.stock_movement_log(movement_type);

-- Indice: historial por usuario (para auditar acciones de un admin)
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_performed_by
  ON public.stock_movement_log(performed_by);


-- ============================================================================
-- PARTE 4: TRIGGERS
-- ============================================================================

-- 4a. Trigger: actualizar updated_at automaticamente en product_stock
-- Reutiliza la funcion update_updated_at_column() que ya existe en el proyecto
-- (definida en supabase_rls_products.sql). Si no existe, la creamos.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_stock_updated_at ON public.product_stock;
CREATE TRIGGER update_product_stock_updated_at
  BEFORE UPDATE ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 4b. Trigger: registrar automaticamente en el log cuando cambia el stock
-- Cada UPDATE en product_stock genera un registro en stock_movement_log
CREATE OR REPLACE FUNCTION public.log_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si la cantidad realmente cambio
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    INSERT INTO public.stock_movement_log (
      product_id,
      movement_type,
      previous_qty,
      new_qty,
      performed_by,
      notes
    ) VALUES (
      NEW.product_id,
      COALESCE(
        -- Intentar obtener el tipo del contexto (set via current_setting)
        NULLIF(current_setting('app.movement_type', true), ''),
        'manual_adjustment'
      ),
      OLD.quantity,
      NEW.quantity,
      NEW.updated_by,
      NEW.notes
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_stock_change ON public.product_stock;
CREATE TRIGGER on_stock_change
  AFTER UPDATE ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stock_change();


-- 4c. Trigger: registrar la carga inicial cuando se crea un registro de stock
CREATE OR REPLACE FUNCTION public.log_initial_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si la cantidad inicial es mayor que 0
  IF NEW.quantity > 0 THEN
    INSERT INTO public.stock_movement_log (
      product_id,
      movement_type,
      previous_qty,
      new_qty,
      performed_by,
      notes
    ) VALUES (
      NEW.product_id,
      'initial_count',
      0,
      NEW.quantity,
      NEW.updated_by,
      COALESCE(NEW.notes, 'Carga inicial de stock')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_stock_created ON public.product_stock;
CREATE TRIGGER on_stock_created
  AFTER INSERT ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.log_initial_stock();


-- ============================================================================
-- PARTE 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- 5a. Habilitar RLS en ambas tablas
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement_log ENABLE ROW LEVEL SECURITY;

-- 5b. Eliminar policies existentes (idempotente)
DROP POLICY IF EXISTS "Admins can view all stock" ON public.product_stock;
DROP POLICY IF EXISTS "Admins can insert stock" ON public.product_stock;
DROP POLICY IF EXISTS "Admins can update stock" ON public.product_stock;
DROP POLICY IF EXISTS "Admins can delete stock" ON public.product_stock;
DROP POLICY IF EXISTS "Authenticated users can view stock" ON public.product_stock;
DROP POLICY IF EXISTS "Admins can view stock log" ON public.stock_movement_log;
DROP POLICY IF EXISTS "System can insert stock log" ON public.stock_movement_log;

-- --------------------------------------------------------------------------
-- POLICIES para product_stock
-- --------------------------------------------------------------------------

-- Lectura: cualquier usuario autenticado puede ver el stock
-- (necesario para mostrar disponibilidad en la tienda publica)
CREATE POLICY "Authenticated users can view stock"
  ON public.product_stock
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insercion: solo admins pueden crear registros de stock
CREATE POLICY "Admins can insert stock"
  ON public.product_stock
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Actualizacion: solo admins pueden modificar el stock
CREATE POLICY "Admins can update stock"
  ON public.product_stock
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Eliminacion: solo admins pueden eliminar registros de stock
CREATE POLICY "Admins can delete stock"
  ON public.product_stock
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- --------------------------------------------------------------------------
-- POLICIES para stock_movement_log
-- --------------------------------------------------------------------------

-- Lectura: solo admins pueden ver el historial de movimientos
CREATE POLICY "Admins can view stock log"
  ON public.stock_movement_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insercion: el trigger (SECURITY DEFINER) inserta registros automaticamente.
-- Tambien permitimos que admins inserten manualmente si es necesario.
CREATE POLICY "System can insert stock log"
  ON public.stock_movement_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- NO hay policies de UPDATE ni DELETE en stock_movement_log.
-- El historial es INMUTABLE por diseno.


-- ============================================================================
-- PARTE 6: VISTA - stock con datos de producto (consulta frecuente)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_product_stock AS
SELECT
  ps.id AS stock_id,
  ps.product_id,
  p.name AS product_name,
  p.price AS product_price,
  p.main_category,
  p.active AS product_active,
  p.image AS product_image,
  ps.quantity,
  ps.min_stock,
  CASE
    WHEN ps.min_stock IS NOT NULL AND ps.quantity <= ps.min_stock THEN true
    ELSE false
  END AS is_low_stock,
  ps.updated_by,
  pr.full_name AS updated_by_name,
  ps.notes,
  ps.updated_at
FROM public.product_stock ps
JOIN public.products p ON p.id = ps.product_id
LEFT JOIN public.profiles pr ON pr.id = ps.updated_by
ORDER BY p.name ASC;

COMMENT ON VIEW public.v_product_stock IS 'Vista de stock con datos del producto y nombre del ultimo editor. Usada en el panel de admin.';


-- ============================================================================
-- PARTE 7: FUNCION AUXILIAR - Upsert de stock (crear o actualizar)
-- ============================================================================
-- Funcion RPC que simplifica la operacion desde el frontend.
-- Si el producto ya tiene stock, lo actualiza. Si no, lo crea.

CREATE OR REPLACE FUNCTION public.upsert_product_stock(
  p_product_id INTEGER,
  p_quantity NUMERIC(12, 3),
  p_min_stock NUMERIC(12, 3) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.product_stock
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result public.product_stock;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();

  -- Verificar que es admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  -- Verificar que el producto existe
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Upsert: insertar o actualizar
  INSERT INTO public.product_stock (
    product_id,
    quantity,
    min_stock,
    updated_by,
    notes
  ) VALUES (
    p_product_id,
    p_quantity,
    p_min_stock,
    v_user_id,
    p_notes
  )
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    min_stock = EXCLUDED.min_stock,
    updated_by = EXCLUDED.updated_by,
    notes = EXCLUDED.notes
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.upsert_product_stock IS 'Crea o actualiza el stock de un producto. Verifica permisos de admin. Uso: SELECT * FROM upsert_product_stock(1, 50, 10, ''Conteo fisico'')';


-- ============================================================================
-- PARTE 8: FUNCION AUXILIAR - Consultar productos con stock bajo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS TABLE (
  product_id INTEGER,
  product_name TEXT,
  quantity NUMERIC(12, 3),
  min_stock NUMERIC(12, 3),
  main_category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que es admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ps.product_id,
    p.name::TEXT AS product_name,
    ps.quantity,
    ps.min_stock,
    p.main_category::TEXT
  FROM public.product_stock ps
  JOIN public.products p ON p.id = ps.product_id
  WHERE ps.min_stock IS NOT NULL
    AND ps.quantity <= ps.min_stock
    AND p.active = true
  ORDER BY (ps.quantity / NULLIF(ps.min_stock, 0)) ASC;
END;
$$;

COMMENT ON FUNCTION public.get_low_stock_products IS 'Retorna productos activos con stock por debajo del minimo configurado. Solo admins.';


-- ============================================================================
-- PARTE 9: VERIFICACION
-- ============================================================================
-- Ejecutar estas queries despues de la migracion para verificar que todo
-- se creo correctamente.

-- 9a. Verificar tabla product_stock
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'product_stock'
ORDER BY ordinal_position;

-- 9b. Verificar tabla stock_movement_log
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'stock_movement_log'
ORDER BY ordinal_position;

-- 9c. Verificar indices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('product_stock', 'stock_movement_log');

-- 9d. Verificar policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('product_stock', 'stock_movement_log')
ORDER BY tablename, policyname;

-- 9e. Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('product_stock', 'stock_movement_log')
ORDER BY event_object_table, trigger_name;

-- 9f. Verificar funciones
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'upsert_product_stock',
    'get_low_stock_products',
    'log_stock_change',
    'log_initial_stock'
  );

-- 9g. Verificar vista
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'v_product_stock';


-- ============================================================================
-- PARTE 10: EJEMPLO DE USO (NO EJECUTAR EN PRODUCCION)
-- ============================================================================
-- Estos ejemplos muestran como usar la solucion desde el frontend.
-- Descomenta para probar en un entorno de desarrollo.

-- Ejemplo 1: Crear/actualizar stock de un producto (via RPC)
-- SELECT * FROM public.upsert_product_stock(
--   p_product_id := 1,
--   p_quantity   := 50,
--   p_min_stock  := 10,
--   p_notes      := 'Conteo fisico inicial'
-- );

-- Ejemplo 2: Consultar stock de todos los productos (via vista)
-- SELECT * FROM public.v_product_stock;

-- Ejemplo 3: Consultar productos con stock bajo
-- SELECT * FROM public.get_low_stock_products();

-- Ejemplo 4: Ver historial de movimientos de un producto
-- SELECT * FROM public.stock_movement_log
-- WHERE product_id = 1
-- ORDER BY created_at DESC;

-- Ejemplo 5: Desde frontend (Supabase JS Client)
-- const { data, error } = await supabase.rpc('upsert_product_stock', {
--   p_product_id: 1,
--   p_quantity: 50,
--   p_min_stock: 10,
--   p_notes: 'Conteo fisico'
-- });

-- Ejemplo 6: Leer stock desde frontend
-- const { data } = await supabase
--   .from('v_product_stock')
--   .select('*')
--   .order('product_name');

-- Ejemplo 7: Leer historial desde frontend
-- const { data } = await supabase
--   .from('stock_movement_log')
--   .select('*')
--   .eq('product_id', 1)
--   .order('created_at', { ascending: false });
