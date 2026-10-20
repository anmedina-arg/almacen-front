-- ============================================================================
-- Función: get_orders_count_by_store
-- Dominio: Store/Platform. Issue #151 (primera pantalla de /admin, ADR-0015).
-- ============================================================================
-- Cantidad de pedidos de cada Store, en una sola tabla: una fila por Store
-- con el total y el desglose por estado de `orders` (pending / confirmed /
-- cancelled). Es el dato de la pantalla de Platform admin en `/admin`
-- (solo lectura), ordenado por total de mayor a menor.
--
-- A diferencia del resto de las RPC de admin (que validan
-- is_store_admin(p_store_id) de UNA Store), esta cruza TODAS las Stores, así
-- que la autorización es solo para el Platform admin (rol `super_admin` en
-- `profiles`, ver CONTEXT.md). Un Store admin común NO puede llamarla: no
-- debe ver los pedidos de otras Stores. Por eso el chequeo es directo sobre
-- `profiles.role` y no is_store_admin() (que también deja pasar a los
-- admins de una Store puntual).
--
-- Incluye las Stores sin pedidos (LEFT JOIN): aparecen con 0, no
-- desaparecen de la tabla. `total` suma los tres estados, cancelados
-- incluidos — el desglose permite ver cuántos son.
--
-- SECURITY DEFINER para leer `orders` de todas las Stores salteando RLS (que
-- las filtra por Store), con `SET search_path = public` fijo. Sin
-- parámetros, así que no hay riesgo de overload con una firma anterior (no
-- hubo firma previa, ver #70). GRANT solo a `authenticated`; se revoca el
-- EXECUTE por defecto de PUBLIC/anon, aunque el chequeo de adentro ya
-- rechaza a cualquiera que no sea super_admin.
--
-- Aplicado y confirmado el 2026-10-15, primero en el proyecto de test y
-- después en producción, con NOTIFY pgrst reload schema en ambos.
-- Test: un solo overload, EXECUTE solo para authenticated; como
-- super_admin devuelve una fila por Store con los pedidos que coinciden con
-- las tablas (el desglose suma el total, las Stores sin pedidos salen con
-- 0); un usuario común y un admin de Store reciben "Forbidden: Platform
-- admin access required". Producción: un solo overload, anon sin EXECUTE y
-- authenticated con EXECUTE, y la pantalla /admin mostró los datos reales
-- con una sesión de super_admin. El rechazo de un no-super_admin dentro de
-- la función se probó solo en test (en producción lo frena antes la página
-- con un 404).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_orders_count_by_store()
RETURNS TABLE (
  store_id         INT,
  store_slug       TEXT,
  store_name       TEXT,
  total_orders     BIGINT,
  pending_orders   BIGINT,
  confirmed_orders BIGINT,
  cancelled_orders BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: Platform admin access required';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.slug,
    s.name,
    COUNT(o.id)                                       AS total_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'pending')   AS pending_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'confirmed') AS confirmed_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders
  FROM public.stores s
  LEFT JOIN public.orders o ON o.store_id = s.id
  -- Demo Store (#153): sus pedidos son pruebas de prospectos, no métrica.
  WHERE s.is_demo = false
  GROUP BY s.id, s.slug, s.name
  ORDER BY COUNT(o.id) DESC, s.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_orders_count_by_store() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_orders_count_by_store() TO authenticated;
