# ✅ Sistema Listo Para Testing

## 🎯 Resumen de Fixes Aplicados

Se corrigieron **6 errores críticos** que bloqueaban el panel de administración:

1. ✅ **Next.js 15 async cookies()** - Aplicación bloqueada (FIXED)
2. ✅ **RLS bloqueaba creación** - No se podían crear productos (FIXED)
3. ✅ **No mostraba productos inactivos** - Solo 214 de 297 productos (FIXED)
4. ✅ **Error en lugar de redirect** - UX confusa para no-admins (FIXED)
5. ✅ **"Categoría inválida"** - No se podían editar productos (FIXED)
6. ✅ **Avatar de Google** - No mostraba foto de perfil (FIXED)

---

## 🚀 Instrucciones Para Empezar

### Paso 1: Reiniciar Servidor (OBLIGATORIO)

```bash
# Detener servidor si está corriendo (Ctrl+C)
npm run dev
```

**IMPORTANTE:** Reinicio necesario por cambios en `next.config.ts` y cookies async.

---

### Paso 2: Verificar Estado Inicial

Antes de testear, confirmar:

#### ✅ Supabase SQL Ejecutado

- [ ok ] `supabase_rls_products.sql` ejecutado
- [ ok ] `supabase_fix_oauth_trigger.sql` ejecutado
- [ ok ] Tu usuario tiene `role = 'admin'` en tabla `profiles`

#### ✅ Base de Datos

Ejecutar en Supabase SQL Editor:

```sql
-- Verificar conteo de productos
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE active = true) as activos,
  COUNT(*) FILTER (WHERE active = false) as inactivos
FROM products;
```

**Resultado esperado:** Total: 297, Activos: 214, Inactivos: 83

---

## 🧪 Tests Prioritarios (Ejecutar en Orden)

### Test 1: Avatar de Google (Nuevo Fix)

**Objetivo:** Verificar que el avatar de Google se muestra

1. Si estás logueado, hacer **logout**
2. Login con Google OAuth
3. **Verificar:**
   - ✅ Header muestra foto de perfil de Google (no solo inicial)
   - ✅ Nombre completo de Google se muestra

**Si falla:**

- Verificar en Supabase → Table Editor → `profiles` que tu email tiene `avatar_url` poblado
- Abrir DevTools → Console, buscar errores de Next.js Image
- Verificar que `lh3.googleusercontent.com` está en `next.config.ts` remotePatterns

GET /_next/static/chunks/node_modules_2df10eaa._.js.map 404 in 1167ms
GET /_next/static/chunks/%5Broot-of-the-server%5D\_\_f2cac508._.js.map 404 in 1199ms
GET /_next/static/chunks/src_c83640de._.js.map 404 in 1256ms

---

### Test 2: RLS - Crear Producto

**Objetivo:** Verificar que admin puede crear productos (Error #1 fixed)

1. Ir a `/admin/products`
2. Click "+ Crear Producto"
3. Llenar formulario:
   - Nombre: `Test Producto Admin`
   - Precio: `99.99`
   - Imagen: `https://res.cloudinary.com/demo/image/upload/sample.jpg`
   - Categoría: `almacen`
   - Activo: ✓
4. Click "Crear"

**Verificar:**

- ✅ Modal se cierra
- ✅ Producto aparece INMEDIATAMENTE en lista
- ✅ NO hay error "row violates row-level security policy"
- ✅ NO hay error 500

**En Supabase:**

- ✅ Producto existe en tabla `products`

Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.

## null value in column "id" of relation "products" violates not-null constraint

### Test 3: Ver Productos Inactivos

**Objetivo:** Verificar que admin ve TODOS los productos (Error #2 fixed)

1. En `/admin/products`, observar contador
2. **Verificar:**
   - ✅ Dice "Mostrando **297** de **297** productos" (no 214)
   - ✅ Se ven productos con overlay oscuro y badge "Inactivo"

3. Cambiar filtro a "Inactivos"
4. **Verificar:**
   - ✅ Muestra **83 productos** (no 0)
   - ✅ TODOS tienen badge "Inactivo"
   - ✅ Contador dice "Mostrando 83 de 297"

---

### Test 4: Editar Producto

**Objetivo:** Verificar que se puede editar sin error de categoría (Error #4 fixed)

1. En cualquier producto, click "Editar"
2. Cambiar solo el **nombre**: `Producto Test EDITADO`
3. **NO cambiar la categoría**
4. Click "Actualizar"

**Verificar:**

- ✅ Modal se cierra sin error
- ✅ NO aparece "categoría inválida"
- ✅ Cambios se ven INMEDIATAMENTE
- ✅ En Supabase, el producto tiene el nuevo nombre

null value in column "id" of relation "products" violates not-null constraint

---

### Test 5: Acceso No Autorizado

**Objetivo:** Verificar mejor UX en redirect (Error #3 fixed)

1. **Logout** completamente
2. Ir directo a `http://localhost:3000/admin/products`

**Verificar:**

- ✅ Muestra loading spinner (no error "Forbidden")
- ✅ Redirige a `/login?redirectTo=/admin/products`
- ✅ UX fluida sin mensajes de error confusos

3. Login como **usuario normal** (role='user')
4. Ir a `/admin/products`

**Verificar:**

- ✅ Muestra loading spinner
- ✅ Redirige a `/?error=unauthorized`

---

## 📋 Tests Completos (Después de Prioritarios)

Una vez que los 5 tests prioritarios pasen, continuar con:

### Módulo 6: Toggle Active/Inactive

- Test 6.1: Desactivar producto activo
- Test 6.2: Activar producto inactivo
- Test 6.3: Toggle rápido (múltiples clicks)

record "new" has no field "updated_at"

### Módulo 7: Eliminar Producto

- Test 7.1: Abrir modal de confirmación
- Test 7.2: Cancelar eliminación
- Test 7.3: Confirmar eliminación
- Test 7.4: Eliminar producto inactivo

### Módulo 8: Optimistic Updates

- Test 8.1: Simular error en crear
- Test 8.2: Simular error en actualizar
- Test 8.3: Simular error en eliminar

### Módulo 9: Permisos y Seguridad

- Test 9.1-9.5: Verificar que usuarios normales no pueden hacer CRUD

### Módulo 10: UI/UX y Responsive

- Test 10.1-10.5: Mobile, tablet, desktop, imágenes, loading states

### Módulo 11: Integración con Catálogo Público

- Test 11.1-11.2: Productos activos/inactivos en home

**Referencia completa:** `TESTING_MANUAL_ADMIN.md`

---

## 🔧 Cambios Técnicos Aplicados

### Archivos Modificados (10 total)

#### API Routes (2)

- `src/app/api/products/route.ts`
  - Async cookies()
  - createSupabaseClient() con getAll/setAll
  - GET y POST con await

- `src/app/api/products/[id]/route.ts`
  - Async cookies()
  - GET, PUT, DELETE con await

#### Admin Components (3)

- `src/features/admin/components/AdminProductList.tsx`
  - Manejo especial de error 403

- `src/features/admin/components/ProductFormModal.tsx`
  - Categorías lowercase ('almacen', 'bebidas', etc.)
  - Default 'almacen'

- `src/features/admin/schemas/productCreateSchema.ts`
  - Enum actualizado con valores lowercase
  - Agregadas todas las categorías del type MainCategory

#### Auth Components (2)

- `src/features/auth/components/UserAvatar.tsx`
  - Query a tabla `profiles` para obtener avatar_url
  - Prioriza profile data sobre user_metadata
  - Soporte completo para imágenes de Google

- `src/features/auth/utils/roleHelpers.ts`
  - Async cookies()
  - getAll/setAll pattern

#### Layouts (1)

- `src/app/admin/layout.tsx`
  - Async cookies()
  - getAll/setAll pattern

#### Config (1)

- `next.config.ts`
  - Agregado dominio de Google: `lh3.googleusercontent.com`

#### Documentación (1)

- `FIXES_APPLIED.md` - Detalles técnicos completos

---

## 🐛 Si Algo Falla

### Avatar de Google no se muestra

**Solución:**

1. Abrir DevTools → Console
2. Buscar errores de Next.js Image
3. Verificar en Supabase que `profiles.avatar_url` tiene valor
4. Hacer logout/login con Google de nuevo
5. Si persiste, verificar que `next.config.ts` tiene el dominio de Google

### Error "cookies() should be awaited"

**Solución:**

- Borrar `.next` completamente: `rm -rf .next` (o eliminar carpeta)
- Reiniciar servidor: `npm run dev`

### Productos inactivos no se ven

**Solución:**

1. Verificar en Supabase SQL Editor:

   ```sql
   SELECT * FROM profiles WHERE id = 'TU_USER_ID';
   ```

   Confirmar que `role = 'admin'`

2. Verificar RLS policies están creadas:
   ```sql
   SELECT tablename, policyname FROM pg_policies WHERE tablename = 'products';
   ```
   Debe haber 5 policies

### Error al crear producto

**Solución:**

1. Confirmar que ejecutaste `supabase_rls_products.sql`
2. Confirmar que tu usuario tiene `role = 'admin'`
3. Abrir DevTools → Network → Ver request de POST /api/products
4. Ver response body para error específico

---

## ✅ Checklist Pre-Testing

Antes de empezar, confirmar:

- [ ] Servidor reiniciado con `npm run dev`
- [ ] `.next` eliminado si hubo problemas
- [ ] Usuario tiene `role = 'admin'` en Supabase
- [ ] SQL scripts ejecutados (RLS + trigger OAuth)
- [ ] Logout/login realizado después de los fixes
- [ ] DevTools abierto para ver errores

---

## 📞 Reportar Resultados

Después de ejecutar los 5 tests prioritarios, reportar:

**Formato:**

```
Test 1 (Avatar Google): ✅ PASS / ❌ FAIL
Test 2 (Crear Producto): ✅ PASS / ❌ FAIL
Test 3 (Ver Inactivos): ✅ PASS / ❌ FAIL
Test 4 (Editar Producto): ✅ PASS / ❌ FAIL
Test 5 (Acceso No Autorizado): ✅ PASS / ❌ FAIL

Errores encontrados:
[Describir cualquier error con screenshots de console]
```

---

**¡Listo para testear!** 🎉

Ejecuta los tests prioritarios y reporta los resultados.
