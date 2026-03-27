-- ============================================================================
-- RLS POLICIES PARA TABLA PRODUCTS - Panel de Administración
-- ============================================================================
-- Este script configura Row Level Security para la tabla products
-- Ejecutar en: Supabase SQL Editor
-- ============================================================================

-- Habilitar RLS en tabla products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS DE LECTURA (SELECT)
-- ============================================================================

-- Policy 1: Usuarios públicos pueden LEER solo productos activos
CREATE POLICY "Public can view active products"
  ON public.products
  FOR SELECT
  USING (active = true);

-- Policy 2: Admins pueden LEER todos los productos (activos e inactivos)
CREATE POLICY "Admins can view all products"
  ON public.products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- POLÍTICAS DE ESCRITURA (INSERT, UPDATE, DELETE)
-- ============================================================================

-- Policy 3: Solo admins pueden INSERTAR productos
CREATE POLICY "Admins can insert products"
  ON public.products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 4: Solo admins pueden ACTUALIZAR productos
CREATE POLICY "Admins can update products"
  ON public.products
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

-- Policy 5: Solo admins pueden ELIMINAR productos
CREATE POLICY "Admins can delete products"
  ON public.products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en tabla products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Para verificar que las policies se crearon correctamente:
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'products';
-- ============================================================================

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Antes de ejecutar este script, asegúrate de que existe la tabla 'profiles'
--    con la columna 'role' (creada por el sistema de autenticación)
--
-- 2. Para asignar rol 'admin' a un usuario:
--    UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID';
--
-- 3. Las policies permiten:
--    - Usuarios no autenticados: VER solo productos activos
--    - Usuarios normales: VER solo productos activos
--    - Admins: VER, CREAR, ACTUALIZAR y ELIMINAR todos los productos
-- ============================================================================
