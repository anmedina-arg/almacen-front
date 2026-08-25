-- ============================================================================
-- Función: is_stock_tracked
-- Dominio: Stock (#97, spec de grilling 2026-08-25, ver ADR-0012)
-- ============================================================================
-- Resuelve si una Store trackea stock en esta app (flag `stock` de
-- stores.feature_flags, #23) — no si el producto en cuestión tiene o no
-- stock cargado. Usada por las 4 funciones del ciclo de vida de una orden
-- que tocan product_stock (create_order, adjust_stock_on_item_update,
-- cancel_order, return_stock_on_item_delete): con stock:false, ninguna de
-- las 4 chequea ni escribe product_stock — todo producto se trata como
-- siempre disponible. Antes de este fix, una Store con stock:false no
-- podía crear NINGÚN pedido (create_order rechazaba con
-- insufficient_stock, ya que /admin/stock — la única forma de cargar
-- stock — está gateada por la misma flag). Pedidos/WhatsApp es una
-- capacidad siempre-encendida: su funcionamiento no puede depender del
-- estado de otra flag (ver ADR-0012).
--
-- Función dedicada y específica de esta regla, no genérica ("chequear
-- cualquier flag por nombre") — mismo criterio que is_store_admin() para
-- autorización: se arma una función nueva cuando una regla real la
-- necesita, no de antemano. Default false si la Store no existe o si la
-- key 'stock' no está seteada en el JSONB — mismo criterio de
-- resolveFeatureFlags() (TS) para keys faltantes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_stock_tracked(p_store_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((feature_flags->>'stock')::boolean, false)
  FROM public.stores
  WHERE id = p_store_id;
$$;
