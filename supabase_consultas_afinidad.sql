-- ============================================================================
-- Consultas útiles: tabla de afinidad de productos
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ── 1. Ver las afinidades más altas (top 30) ─────────────────────────────────
SELECT
  ROUND(pa.score::NUMERIC, 4)  AS score,
  a.name                        AS producto_a,
  b.name                        AS producto_b,
  pa.calculated_at
FROM product_affinity pa
JOIN products a ON a.id = pa.product_id_a
JOIN products b ON b.id = pa.product_id_b
ORDER BY pa.score DESC
LIMIT 30;

-- ── 2. Ver afinidades de un producto específico ───────────────────────────────
-- Reemplazar <ID_PRODUCTO> con el ID real (ej: 37)
SELECT
  ROUND(pa.score::NUMERIC, 4)  AS score,
  b.name                        AS sugerido
FROM product_affinity pa
JOIN products b ON b.id = pa.product_id_b
WHERE pa.product_id_a = <ID_PRODUCTO>
ORDER BY pa.score DESC;

-- ── 3. Buscar el ID de un producto por nombre ─────────────────────────────────
SELECT id, name, price
FROM products
WHERE name ILIKE '%nombre%'   -- reemplazar 'nombre' con parte del nombre
ORDER BY name;

-- ── 4. Probar get_recommendations para un producto ───────────────────────────
-- Reemplazar <ID_PRODUCTO> con el ID real
SELECT *
FROM get_recommendations(
  ARRAY[<ID_PRODUCTO>],   -- productos en el carrito
  ARRAY[<ID_PRODUCTO>],   -- excluir (los que ya están en el carrito)
  3                        -- cantidad de sugerencias
);

-- ── 5. Ver cuántas afinidades hay en total ────────────────────────────────────
SELECT COUNT(*) AS total_pares FROM product_affinity;

-- ── 6. Ver reglas de afinidad por categoría configuradas ─────────────────────
SELECT
  car.id,
  ROUND(car.boost::NUMERIC, 2) AS boost,
  fc.name AS desde_categoria,
  tc.name AS hacia_categoria
FROM category_affinity_rules car
JOIN categories fc ON fc.id = car.from_category_id
JOIN categories tc ON tc.id = car.to_category_id
ORDER BY car.boost DESC;

-- ── 7. Ver IDs de todas las categorías (para configurar reglas) ───────────────
SELECT id, name FROM categories ORDER BY name;

-- ── 8. Agregar una regla de categoría ────────────────────────────────────────
-- Reemplazar los IDs con los obtenidos en la consulta anterior
-- INSERT INTO category_affinity_rules (from_category_id, to_category_id, boost)
-- VALUES (<ID_DESDE>, <ID_HACIA>, 2.0)
-- ON CONFLICT (from_category_id, to_category_id) DO UPDATE SET boost = EXCLUDED.boost;
