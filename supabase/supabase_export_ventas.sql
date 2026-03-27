-- ============================================================================
-- EXPORT: Detalle de ventas — una fila por ítem de orden
-- ============================================================================
--
-- TABLAS INVOLUCRADAS
-- -------------------
--   orders          → encabezado de la orden (estado, fecha, total)
--   order_items     → línea de venta (producto, cantidad, precio, costo)
--   clients         → cliente asignado a la orden (opcional)
--   order_payments  → método(s) de pago (puede haber 0, 1 o 2 por orden)
--   products        → tipo de venta y categoría del producto
--   categories      → nombre de categoría del producto
--
-- COLUMNAS CALCULADAS
-- -------------------
--   subtotal        = quantity × unit_price  (generado en DB)
--   costo_total     = quantity × unit_cost
--   margen          = subtotal - costo_total
--   margen_pct      = margen / subtotal × 100  (NULL si subtotal = 0)
--   saldo_orden     = orders.total - suma de pagos con monto explícito
--                     (NULL si no hay pagos con monto registrado)
--
-- FILTROS SUGERIDOS (descomentar según necesidad)
-- -------------------
--   Solo órdenes confirmadas:  AND o.status = 'confirmed'
--   Solo órdenes pendientes:   AND o.status = 'pending'
--   Rango de fechas:           AND o.created_at BETWEEN '2026-01-01' AND '2026-03-31'
--
-- USO EN SUPABASE
-- ---------------
-- 1. Pegar en el SQL Editor
-- 2. Ejecutar
-- 3. Botón "Download CSV" en los resultados
-- ============================================================================

SELECT
  -- ── Orden ──────────────────────────────────────────────────────────────────
  o.id                                                    AS orden_id,
  o.status                                                AS estado,
  TO_CHAR(o.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires',
          'YYYY-MM-DD HH24:MI')                           AS fecha_creacion,
  TO_CHAR(o.confirmed_at AT TIME ZONE 'America/Argentina/Buenos_Aires',
          'YYYY-MM-DD HH24:MI')                           AS fecha_confirmacion,
  o.total                                                 AS total_orden,

  -- ── Cliente ────────────────────────────────────────────────────────────────
  COALESCE(c.display_code, 'Sin asignar')                 AS cliente_codigo,
  COALESCE(c.barrio, '')                                  AS cliente_barrio,
  COALESCE(c.manzana_lote, '')                            AS cliente_descripcion,

  -- ── Pago ───────────────────────────────────────────────────────────────────
  -- Agrega todos los métodos de pago en una sola cadena (ej: "efectivo / transferencia")
  COALESCE(
    STRING_AGG(DISTINCT op.method, ' / ' ORDER BY op.method),
    'Sin pago'
  )                                                       AS metodo_pago,
  -- Suma de montos explícitos registrados (NULL si ningún pago tiene monto)
  SUM(DISTINCT op.amount)                                 AS monto_pagado,
  -- Saldo pendiente: positivo = cliente debe, negativo = nosotros debemos
  CASE
    WHEN SUM(DISTINCT op.amount) IS NOT NULL
    THEN o.total - SUM(DISTINCT op.amount)
    ELSE NULL
  END                                                     AS saldo_pendiente,

  -- ── Ítem ───────────────────────────────────────────────────────────────────
  oi.id                                                   AS item_id,
  oi.product_name                                         AS producto,
  COALESCE(cat.name, '')                                  AS categoria,
  COALESCE(p.sale_type, '')                               AS tipo_venta,
  CASE WHEN COALESCE(p.is_combo, FALSE) THEN 'sí' ELSE 'no' END AS es_combo,

  -- Cantidad en unidades naturales según tipo de venta:
  --   unit  → cantidad directa
  --   kg    → gramos ÷ 1000 = kg
  --   100gr → gramos ÷ 100  = unidades de 100gr
  CASE
    WHEN p.sale_type = 'kg'    THEN ROUND(oi.quantity / 1000, 3)
    WHEN p.sale_type = '100gr' THEN ROUND(oi.quantity / 100,  3)
    ELSE oi.quantity
  END                                                     AS cantidad,
  CASE
    WHEN p.sale_type = 'kg'    THEN 'kg'
    WHEN p.sale_type = '100gr' THEN 'unid x100gr'
    ELSE 'unid'
  END                                                     AS unidad,

  -- ── Precios y costos ────────────────────────────────────────────────────────
  -- unit_price está normalizado por base (precio/1000 para kg, precio/100 para 100gr)
  -- Para mostrar precio de lista usamos el precio actual del producto
  COALESCE(p.price, 0)                                    AS precio_lista_actual,
  oi.subtotal                                             AS subtotal_venta,
  ROUND(oi.quantity * oi.unit_cost, 2)                    AS costo_total,
  ROUND(oi.subtotal - (oi.quantity * oi.unit_cost), 2)    AS margen,
  CASE
    WHEN oi.subtotal > 0
    THEN ROUND(
      (oi.subtotal - (oi.quantity * oi.unit_cost)) / oi.subtotal * 100,
      1
    )
    ELSE NULL
  END                                                     AS margen_pct

FROM orders o

-- Ítems (inner join: solo órdenes que tienen al menos un ítem)
JOIN order_items oi
  ON oi.order_id = o.id

-- Producto actual (left join: puede haberse eliminado el producto)
LEFT JOIN products p
  ON p.id = oi.product_id

-- Categoría del producto
LEFT JOIN categories cat
  ON cat.id = p.category_id

-- Cliente asignado a la orden
LEFT JOIN clients c
  ON c.id = o.client_id

-- Pagos (left join: una orden puede no tener pago registrado)
LEFT JOIN order_payments op
  ON op.order_id = o.id

-- ── FILTROS ─────────────────────────────────────────────────────────────────
-- Sin filtros: todas las órdenes, todos los estados, todas las fechas
-- WHERE o.status IN ('pending', 'confirmed')   -- excluye órdenes canceladas
-- WHERE o.status = 'confirmed'                 -- solo confirmadas
-- WHERE o.created_at >= '2026-03-01'           -- desde fecha
--   AND o.created_at <  '2026-04-01'           -- hasta fecha

GROUP BY
  o.id, o.status, o.created_at, o.confirmed_at, o.total,
  c.display_code, c.barrio, c.manzana_lote,
  oi.id, oi.product_name, oi.quantity, oi.unit_price, oi.unit_cost, oi.subtotal,
  p.sale_type, p.is_combo, p.price,
  cat.name

ORDER BY
  o.created_at DESC,
  o.id,
  oi.id;
