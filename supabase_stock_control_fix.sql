-- ============================================================================
-- FIX: Actualizar función upsert_product_stock para incluir p_movement_type
-- ============================================================================
-- Este script actualiza la función RPC para aceptar el tipo de movimiento
-- que el frontend está enviando.
--
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================================

-- Eliminar la función anterior
DROP FUNCTION IF EXISTS public.upsert_product_stock(INTEGER, NUMERIC, NUMERIC, TEXT);

-- Crear la función actualizada con p_movement_type
CREATE OR REPLACE FUNCTION public.upsert_product_stock(
  p_product_id INTEGER,
  p_quantity NUMERIC(12, 3),
  p_min_stock NUMERIC(12, 3) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_movement_type TEXT DEFAULT 'manual_adjustment'
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

  -- Establecer el tipo de movimiento en el contexto para que el trigger lo use
  PERFORM set_config('app.movement_type', p_movement_type, true);

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

COMMENT ON FUNCTION public.upsert_product_stock IS 'Crea o actualiza el stock de un producto con tipo de movimiento. Verifica permisos de admin.';

-- Verificar que la función se creó correctamente
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'upsert_product_stock';
