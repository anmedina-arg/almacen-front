-- =============================================================================
-- STOCK ENTRY RPC: increment_product_stock()
-- =============================================================================
-- Propósito: Sumar una cantidad incremental al stock existente de un producto.
--            A diferencia de upsert_product_stock() que REEMPLAZA el stock,
--            esta función SUMA (quantity = quantity + p_increment).
--
-- Uso: Feature "Ingreso de Stock" en /admin/stock/entry
-- Tipo de movimiento registrado: 'purchase' (Compra / Reposición)
--
-- El trigger on_stock_change registra el movimiento automáticamente
-- usando el tipo configurado con set_config().
--
-- INSTRUCCIONES: Ejecutar en Supabase SQL Editor antes de usar la feature.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id   INTEGER,
  p_increment    NUMERIC(12, 3),
  p_notes        TEXT DEFAULT NULL
)
RETURNS public.product_stock
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result  public.product_stock;
BEGIN
  v_user_id := auth.uid();

  -- Verificar que el usuario sea admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  -- Verificar que el producto exista
  IF NOT EXISTS (
    SELECT 1 FROM products WHERE id = p_product_id
  ) THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Validar que el incremento sea positivo
  IF p_increment <= 0 THEN
    RAISE EXCEPTION 'Increment must be greater than 0, got: %', p_increment;
  END IF;

  -- Configurar el tipo de movimiento para el trigger on_stock_change
  PERFORM set_config('app.movement_type', 'purchase', true);

  -- Insertar o actualizar sumando (no reemplazando)
  INSERT INTO product_stock (product_id, quantity, updated_by, notes)
  VALUES (p_product_id, p_increment, v_user_id, p_notes)
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity   = product_stock.quantity + EXCLUDED.quantity,
    updated_by = EXCLUDED.updated_by,
    notes      = EXCLUDED.notes,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Revocar acceso público y otorgar solo a usuarios autenticados
REVOKE ALL ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, TEXT) TO authenticated;
