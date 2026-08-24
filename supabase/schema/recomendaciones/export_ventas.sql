-- ============================================================================
-- Función: export_ventas
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Prepara
-- terreno para #21.
-- ============================================================================
-- Detalle de ventas, una fila por ítem de orden — consumida por
-- /api/reports/ventas para el CSV de "Informes". `desde_sugerencia` viene
-- de order_items.from_suggestion (dominio Orders, #84).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-24 — la
-- versión vigente es la de supabase_export_ventas_fn.sql (con parámetros
-- p_start_date/p_end_date y GROUP BY), no la query cruda sin parametrizar
-- de supabase_export_ventas.sql (esa era para pegar a mano en el SQL
-- Editor y usar el botón "Download CSV" — superseded, sin objeto propio).
--
-- GAP DE ENTORNO, no corregido acá: la versión vigente en el proyecto de
-- test NO tiene la columna desde_sugerencia (firma más vieja que
-- producción) — aplicar este canónico ahí requiere DROP FUNCTION primero
-- (cambia el tipo de retorno). Decisión explícita, consultada con el
-- usuario: no tocar test en #90, mismo criterio que el trigger
-- on_auth_user_created en #87.
-- ============================================================================

CREATE OR REPLACE FUNCTION export_ventas(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  orden_id             BIGINT,
  estado               TEXT,
  fecha_creacion       TEXT,
  fecha_confirmacion   TEXT,
  total_orden          NUMERIC,
  cliente_codigo       TEXT,
  cliente_barrio       TEXT,
  cliente_descripcion  TEXT,
  metodo_pago          TEXT,
  monto_pagado         NUMERIC,
  saldo_pendiente      NUMERIC,
  item_id              BIGINT,
  producto             TEXT,
  categoria            TEXT,
  tipo_venta           TEXT,
  es_combo             TEXT,
  cantidad             NUMERIC,
  unidad               TEXT,
  precio_lista_actual  NUMERIC,
  subtotal_venta       NUMERIC,
  costo_total          NUMERIC,
  margen               NUMERIC,
  margen_pct           NUMERIC,
  desde_sugerencia     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    o.id,
    o.status::TEXT,
    TO_CHAR(o.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD HH24:MI'),
    TO_CHAR(o.confirmed_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD HH24:MI'),
    o.total,

    COALESCE(c.display_code, 'Sin asignar'),
    COALESCE(c.barrio, ''),
    COALESCE(c.manzana_lote, ''),

    COALESCE(STRING_AGG(DISTINCT op.method, ' / ' ORDER BY op.method), 'Sin pago'),
    SUM(DISTINCT op.amount),
    CASE
      WHEN SUM(DISTINCT op.amount) IS NOT NULL
      THEN o.total - SUM(DISTINCT op.amount)
      ELSE NULL
    END,

    oi.id,
    oi.product_name,
    COALESCE(cat.name, ''),
    COALESCE(p.sale_type, ''),
    CASE WHEN COALESCE(p.is_combo, FALSE) THEN 'sí' ELSE 'no' END,

    CASE
      WHEN p.sale_type = 'kg'    THEN ROUND(oi.quantity / 1000, 3)
      WHEN p.sale_type = '100gr' THEN ROUND(oi.quantity / 100,  3)
      ELSE oi.quantity
    END,
    CASE
      WHEN p.sale_type = 'kg'    THEN 'kg'
      WHEN p.sale_type = '100gr' THEN 'unid x100gr'
      ELSE 'unid'
    END,

    COALESCE(p.price, 0),
    oi.subtotal,
    ROUND(oi.quantity * oi.unit_cost, 2),
    ROUND(oi.subtotal - (oi.quantity * oi.unit_cost), 2),
    CASE
      WHEN oi.subtotal > 0
      THEN ROUND((oi.subtotal - (oi.quantity * oi.unit_cost)) / oi.subtotal * 100, 1)
      ELSE NULL
    END,

    CASE WHEN COALESCE(oi.from_suggestion, FALSE) THEN 'sí' ELSE 'no' END

  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p    ON p.id  = oi.product_id
  LEFT JOIN categories cat ON cat.id = p.category_id
  LEFT JOIN clients c     ON c.id  = o.client_id
  LEFT JOIN order_payments op ON op.order_id = o.id

  WHERE (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date   IS NULL OR o.created_at <= p_end_date)

  GROUP BY
    o.id, o.status, o.created_at, o.confirmed_at, o.total,
    c.display_code, c.barrio, c.manzana_lote,
    oi.id, oi.product_name, oi.quantity, oi.unit_price, oi.unit_cost, oi.subtotal, oi.from_suggestion,
    p.sale_type, p.is_combo, p.price,
    cat.name

  ORDER BY o.created_at DESC, o.id, oi.id;
$$;
