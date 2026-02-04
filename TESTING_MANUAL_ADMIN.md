# Testing Manual Completo - Panel de Administración

## Configuración Previa (REQUERIDO)

### ✅ Pre-requisito 1: Verificar Scripts SQL Ejecutados

- [ ] Ejecutar `supabase_setup.sql` en Supabase SQL Editor
- [ ] Ejecutar `supabase_fix_oauth_trigger.sql` en Supabase SQL Editor
- [ ] Ejecutar `supabase_rls_products.sql` en Supabase SQL Editor
- [ ] Verificar que no hay errores en la ejecución

### ✅ Pre-requisito 2: Asignar Rol Admin

1. [ ] Ir a Supabase → Table Editor → `profiles`
2. [ ] Buscar tu usuario (por email)
3. [ ] Cambiar columna `role` de `'user'` a `'admin'`
4. [ ] Guardar cambios
5. [ ] **Resultado esperado**: Tu usuario tiene `role = 'admin'`

### ✅ Pre-requisito 3: Verificar Triggers

```sql
-- Ejecutar en Supabase SQL Editor:
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'profiles', 'products');
```

- [ ] Debe mostrar: `on_auth_user_created` en tabla `users`
- [ ] Debe mostrar: `on_profile_updated` en tabla `profiles`
- [ ] Debe mostrar: `update_products_updated_at` en tabla `products`

### ✅ Pre-requisito 4: Verificar RLS Policies

```sql
-- Ejecutar en Supabase SQL Editor:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'products')
ORDER BY tablename, policyname;
```

- [ ] Debe mostrar 3 policies para `profiles`
- [ ] Debe mostrar 5 policies para `products`

### ✅ Pre-requisito 5: Estado Inicial de Productos

```sql
-- Ejecutar en Supabase SQL Editor:
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE active = true) as activos,
       COUNT(*) FILTER (WHERE active = false) as inactivos
FROM products;
```

- [ ] Anotar números: Total: **297\_, Activos: \_214**, Inactivos: \__83_

---

## MÓDULO 1: AUTENTICACIÓN

### Test 1.1: Login con Email/Password

**Pre-condición**: Tener un usuario creado con email/password

1. [ ok ] Ir a `http://localhost:3000`
2. [ ok ] Click en "Iniciar sesión" en el header
3. [ ok ] Ingresar email y contraseña
4. [ ok ] Click "Iniciar sesión"

**✅ Resultado esperado**:

- [ ok ] Redirige a `/` (home)
- [ ok ] Header muestra avatar con inicial del nombre
- [ ok ] Header muestra nombre del usuario
- [ ok ] Header muestra botón "Salir"
- [ ok ] **NO** muestra "Iniciar sesión"

**❌ Si falla**: Anotar error específico y captura de pantalla

---

### Test 1.2: Login con Google OAuth

**Pre-condición**: Tener cuenta de Google

1. [ ok ] Logout si estás logueado (click "Salir")
2. [ ok ] Click en "Iniciar sesión"
3. [ ok ] Click en "Continuar con Google"
4. [ ok ] Autorizar en Google (si es primera vez)
5. [ ok ] Esperar redirección

**✅ Resultado esperado**:

- [ ok ] Redirige a `/auth/callback` (brevemente)
- [ ok ] Luego redirige a `/` (home)
- [ X ] Header muestra avatar con foto de Google - Nota: no muestra la foto de google, muestra solo el avatar con la letra de mi nombre.
- [ ok ] Header muestra nombre de Google
- [ ok ] Header muestra botón "Salir"

**✅ Verificación en Supabase**: 6. [ ] Ir a Supabase → Table Editor → `profiles` 7. [ ] Buscar tu email de Google 8. [ ] **Resultado esperado**:

- [ ok ] Existe un registro con tu email
- [ ok ] `full_name` tiene tu nombre de Google
- [ ok ] `avatar_url` tiene URL de foto de Google
- [ ok ] `role` es `'user'` (si no lo cambiaste a admin)

**❌ Si falla**:

- [ ] Si no redirige: Anotar URL donde se queda
- [ ] Si no hay perfil en DB: Ejecutar query de verificación:

```sql
SELECT u.id, u.email, u.raw_user_meta_data
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'TU_EMAIL_GOOGLE@gmail.com';
```

- [ ] Anotar el contenido de `raw_user_meta_data`

---

### Test 1.3: Persistencia de Sesión

1. [ ok ] Login con cualquier método
2. [ ok ] Cerrar navegador completamente
3. [ ok ] Abrir navegador de nuevo
4. [ ok ] Ir a `http://localhost:3000`

**✅ Resultado esperado**:

- [ ok ] Sigue logueado (header muestra avatar y nombre)
- [ ok ] No redirige a login

**❌ Si falla**: La sesión no persiste, revisar cookies/localStorage

---

### Test 1.4: Logout

1. [ ok ] Estando logueado, click "Salir"

**✅ Resultado esperado**:

- [ ok ] Redirige a `/` (home)
- [ ok ] Header muestra "Iniciar sesión"
- [ ok ] **NO** muestra avatar ni nombre
- [ ok ] **NO** muestra botón "Salir"

---

## MÓDULO 2: PROTECCIÓN DE RUTAS Y ROLES

### Test 2.1: Acceso Admin sin Login

1. [ ok ] Logout completamente
2. [ ok ] Ir directo a `http://localhost:3000/admin/products`

**✅ Resultado esperado**:

- [ X ] Redirige a `/login?redirectTo=/admin/products`
- [ X ] Muestra página de login
  ERROR: DESCRIPCIÓN: Queda un loader cargando, no redirige y muestra error en pantalla. El mensaje de error es: Error al cargar productos: Forbidden: Admin access required.

---

### Test 2.2: Acceso Admin como Usuario Normal

**Pre-condición**: Tener un usuario con `role='user'`

1. [ ok ] Login con usuario normal (NO admin)
2. [ ok ] Ir directo a `http://localhost:3000/admin/products`

**✅ Resultado esperado**:

- [ X ] Redirige a `/?error=unauthorized`
- [ X ] Muestra home (NO muestra panel admin)

ERROR: DESCRIPCIÓN: Queda un loader cargando, no redirige y muestra error en pantalla. El mensaje de error es: Error al cargar productos: Forbidden: Admin access required.

---

### Test 2.3: Acceso Admin como Admin

**Pre-condición**: Tener rol `'admin'` asignado en Supabase

1. [ ok ] Login con usuario admin
2. [ ok ] Ir a `http://localhost:3000/admin/products`

**✅ Resultado esperado**:

- [ ok ] Muestra panel de administración
- [ ok ] Header dice "Panel de Administración"
- [ ok ] Muestra "Gestión de productos - Market del Cevil"
- [ ok ] Muestra link "← Volver al sitio"
- [ ok ] Muestra lista de productos
- [ ok ] Muestra botón verde "+ Crear Producto"
- [ ok ] Muestra campo de búsqueda
- [ ok ] Muestra filtro (Todos/Activos/Inactivos)

---

## MÓDULO 3: VISUALIZACIÓN DE PRODUCTOS (ADMIN)

### Test 3.1: Ver Todos los Productos

**Pre-condición**: Estar logueado como admin en `/admin/products`

1. [ ok ] Observar la lista de productos

**✅ Resultado esperado**:

- [ X ] Muestra TODOS los productos (activos E inactivos) - ERROR: no muestra los productos inactivos, de hecho la leyenda dice: "mostrando 214 de 214 productos"
- [ X ] Productos inactivos tienen overlay oscuro - ERROR: no se ven productos inactivos
- [ X ] Productos inactivos tienen badge rojo "Inactivo" - ERROR: no se ven productos inactivos
- [ ok ] Contador dice "Mostrando X de Y productos" - NOTA: si lo dice, pero son solo los productos activos
- [ X ] El número X debe coincidir con total de productos en DB - NOTA: coincide la cantidad de productos activos, no el total, no se muestran los inactivos.

**✅ Verificación**: Comparar con query SQL del Pre-requisito 5

---

### Test 3.2: Filtro "Activos"

1. [ ok ] Cambiar filtro a "Activos"

**✅ Resultado esperado**:

- [ ok ] Muestra solo productos con `active = true`
- [ ok ] **NO** muestra productos con badge "Inactivo"
- [ ok ] Contador actualiza: "Mostrando X de Y productos"
- [ ok ] X debe coincidir con productos activos de DB

---

### Test 3.3: Filtro "Inactivos"

1. [ ok ] Cambiar filtro a "Inactivos"

**✅ Resultado esperado**:

- [ X ] Muestra solo productos con `active = false`
- [ X ] TODOS tienen overlay oscuro y badge "Inactivo"
- [ X ] Contador actualiza: "Mostrando X de Y productos"
- [ X ] X debe coincidir con productos inactivos de DB

ERROR: no se muestra ningun producto inactivo. El contador actualiza a "Mostrando 0 productos de 214", aqui hay un error en el total tambien, cuenta como total la cantidad de activos y no la suma de activos más inactivos.

---

### Test 3.4: Búsqueda por Nombre

1. [ ok ] Cambiar filtro a "Todos"
2. [ ok ] En campo de búsqueda, escribir nombre parcial de producto (ej: "coca")

**✅ Resultado esperado**:

- [ ok ] Filtra en tiempo real mientras escribes
- [ ok ] Muestra solo productos que coinciden con búsqueda
- [ ok ] Búsqueda es case-insensitive (funciona con mayúsculas/minúsculas)
- [ ok ] Contador actualiza - NOTA: el contador dice: "mostrando 1 de 214 productos", mantiene error del total como cantidad de productos activos solamente.

3. [ ok ] Borrar búsqueda

**✅ Resultado esperado**:

- [ ok ] Vuelve a mostrar todos los productos

---

### Test 3.5: Búsqueda + Filtro Combinados

1. [ ok ] Escribir búsqueda: "coca"
2. [ ok ] Cambiar filtro a "Activos"

**✅ Resultado esperado**:

- [ ok ] Muestra solo productos que coinciden con "coca" Y están activos
- [ ok ] Contador refleja el resultado combinado

---

## MÓDULO 4: CREAR PRODUCTO

### Test 4.1: Abrir Modal de Crear

1. [ ok ] Click en botón "+ Crear Producto"

**✅ Resultado esperado**:

- [ ok ] Abre modal sobre la página
- [ ok ] Fondo oscuro semitransparente
- [ ok ] Modal tiene título "Crear Producto"
- [ ok ] Modal tiene botón "✕" para cerrar
- [ ok ] Formulario tiene campos:
  - [ ok ] Nombre del producto \*
  - [ ok ] Precio \*
  - [ ok ] URL de imagen (Cloudinary) \*
  - [ ok ] Categoría principal \* (select)
  - [ ok ] Categorías adicionales (input)
  - [ ok ] Checkbox "Producto activo" (marcado por defecto)
- [ ok ] Botones: "Cancelar" y "Crear"

---

### Test 4.2: Cerrar Modal sin Guardar

1. [ ok ] Con modal abierto, click en "✕" o "Cancelar"

**✅ Resultado esperado**:

- [ ok ] Modal se cierra
- [ ok ] Vuelve a mostrar lista de productos
- [ ok ] No se creó ningún producto

---

### Test 4.3: Validación de Campos Vacíos

1. [ ok ] Abrir modal de crear
2. [ ok ] Dejar todos los campos vacíos
3. [ ok ] Click "Crear"

**✅ Resultado esperado**:

- [ ok ] Modal NO se cierra
- [ ok ] Muestra errores de validación:
  - [ ok ] "Mínimo 2 caracteres" en Nombre
  - [ ok ] Error en Precio
  - [ ok ] "Imagen requerida" en URL
- [ ok ] Errores en texto rojo debajo de cada campo

---

### Test 4.4: Validación de Precio Inválido

1. [ ok ] Llenar nombre: "Test Producto"
2. [ X ] Precio: `-5` (negativo) - ERROR: el campo directamente no permite ingresar numeros negativos de ninguna manera.
3. [ ok ] Imagen: `https://ejemplo.com/imagen.jpg`
4. [ ok ] Click "Crear"

**✅ Resultado esperado**:

- [ X ] Muestra error: "El precio debe ser positivo"

5. [ ok ] Cambiar precio a: `0`
6. [ ok ] Click "Crear"

**✅ Resultado esperado**:

- [ ok ] Muestra error: "Precio mínimo: $0.01"

---

### Test 4.5: Validación de URL Inválida

1. [ ok ] Llenar todos los campos correctamente
2. [ ok ] URL de imagen: `no-es-una-url`
3. [ ok ] Click "Crear"

**✅ Resultado esperado**:

- [ ok ] Muestra error: "URL inválida"

---

### Test 4.6: Crear Producto Exitosamente

1. [ ok ] Llenar formulario:
   - Nombre: `Producto Test Admin`
   - Precio: `99.99`
   - Imagen: `https://res.cloudinary.com/demo/image/upload/sample.jpg`
   - Categoría: `Almacen`
   - Categorías adicionales: `test, nuevo`
   - Producto activo: ✓ (marcado)
2. [ ok ] Click "Crear"

**✅ Resultado esperado**:

- [ X ] Modal se cierra
- [ X ] Producto aparece INMEDIATAMENTE en la lista (optimistic update)
- [ X ] Producto tiene nombre "Producto Test Admin"
- [ X ] Precio: "$99.99"
- [ X ] Categoría: "Almacen"
- [ X ] **NO** tiene badge "Inactivo" (porque está activo)

ERROR: No se crea el producto, muestra el siguiente mensaje en pantalla: new row violates row-level security policy for table "products" y en consola el mismo error acompañado de un error en el metodo POST, codigo de error: 500

**✅ Verificación en Supabase**: 3. [ X ] Ir a Supabase → Table Editor → `products` 4. [ X ] Buscar "Producto Test Admin" 5. [ X ] **Resultado esperado**:

- [ X ] Existe el registro
- [ X ] `name = 'Producto Test Admin'`
- [ X ] `price = 99.99`
- [ X ] `active = true`
- [ X ] `main_category = 'Almacen'`
- [ X ] `categories = 'test, nuevo'`

ERROR: No se crea el producto en la db.

---

### Test 4.7: Crear Producto Inactivo

1. [ ] Click "+ Crear Producto"
2. [ ] Llenar formulario:
   - Nombre: `Producto Inactivo Test`
   - Precio: `50`
   - Imagen: URL válida
   - Categoría: `Bebidas`
   - **Desmarcar** checkbox "Producto activo"
3. [ ] Click "Crear"

**✅ Resultado esperado**:

- [ ] Producto aparece en lista con overlay oscuro
- [ ] Tiene badge rojo "Inactivo"

ERROR: El mismo error que al crear un prducto con estado activo, no se crea el producto.

---

## MÓDULO 5: EDITAR PRODUCTO

### Test 5.1: Abrir Modal de Editar

1. [ ok ] En cualquier producto, click botón "Editar" (azul)

**✅ Resultado esperado**:

- [ ok ] Abre modal
- [ ok ] Título: "Editar Producto"
- [ ok ] Campos pre-llenados con datos del producto
- [ ok ] Botones: "Cancelar" y "Actualizar"

---

### Test 5.2: Cancelar Edición

1. [ ok ] Con modal de editar abierto
2. [ ok ] Modificar algún campo
3. [ ok ] Click "Cancelar"

**✅ Resultado esperado**:

- [ ok ] Modal se cierra
- [ ok ] Producto NO cambió en la lista

---

### Test 5.3: Editar Nombre y Precio

1. [ ok ] Editar "Producto Test Admin"
2. [ ok ] Cambiar nombre a: `Producto Test EDITADO`
3. [ ok ] Cambiar precio a: `150.50`
4. [ ok ] Click "Actualizar"

**✅ Resultado esperado**:

- [ X ] Modal se cierra
- [ X ] Cambios se reflejan INMEDIATAMENTE (optimistic update)
- [ X ] Card muestra: "Producto Test EDITADO"
- [ X ] Precio: "$150.50"

ERROR: Sale un mensaje de error de categoria invalida, pero la categoria no se cambió, se mantuvo la que tenia. Finalmente no se actualiza el producto.

**✅ Verificación en Supabase**: 5. [ X ] Verificar en Table Editor que cambió - ERROR: se verifica que no se realizan cambios en la db.

---

### Test 5.4: Editar Categoría

1. [ ok ] Editar un producto
2. [ ok ] Cambiar categoría principal a: `Snacks`
3. [ ok ] Click "Actualizar"

**✅ Resultado esperado**:

- [ X ] Card muestra "Snacks" debajo del precio

---

### Test 5.5: Validación en Edición

1. [ ] Editar un producto
2. [ ] Borrar nombre (dejar vacío)
3. [ ] Click "Actualizar"

**✅ Resultado esperado**:

- [ ] Muestra error de validación
- [ ] Modal NO se cierra
- [ ] Producto NO cambia

---

## MÓDULO 6: TOGGLE ACTIVE/INACTIVE

### Test 6.1: Desactivar Producto Activo

**Pre-condición**: Tener un producto activo

1. [ ] En producto activo, click botón "Desactivar" (amarillo)

**✅ Resultado esperado**:

- [ ] Botón muestra "..." mientras procesa
- [ ] Producto cambia INMEDIATAMENTE a inactivo (optimistic)
- [ ] Aparece overlay oscuro
- [ ] Aparece badge rojo "Inactivo"
- [ ] Botón cambia a verde "Activar"

**✅ Verificación en Supabase**: 2. [ ] Verificar que `active = false`

**✅ Verificación Frontend Público**: 3. [ ] Ir a home (sin admin) 4. [ ] **Resultado esperado**: Producto NO aparece en catálogo público

---

### Test 6.2: Activar Producto Inactivo

**Pre-condición**: Tener un producto inactivo

1. [ ] En producto inactivo, click botón "Activar" (verde)

**✅ Resultado esperado**:

- [ ] Botón muestra "..." mientras procesa
- [ ] Producto cambia INMEDIATAMENTE a activo (optimistic)
- [ ] Desaparece overlay oscuro
- [ ] Desaparece badge "Inactivo"
- [ ] Botón cambia a amarillo "Desactivar"

**✅ Verificación Frontend Público**: 2. [ ] Ir a home (sin admin) 3. [ ] **Resultado esperado**: Producto APARECE en catálogo público

---

### Test 6.3: Toggle Rápido (Multiple Clicks)

1. [ ] Click "Desactivar"
2. [ ] Inmediatamente click "Activar"
3. [ ] Inmediatamente click "Desactivar"

**✅ Resultado esperado**:

- [ ] UI responde a cada click
- [ ] No se rompe ni muestra errores
- [ ] Estado final en DB coincide con último click

---

## MÓDULO 7: ELIMINAR PRODUCTO

### Test 7.1: Abrir Modal de Confirmación

1. [ ] En cualquier producto, click botón "Eliminar" (rojo)

**✅ Resultado esperado**:

- [ ] Abre modal de confirmación
- [ ] Título: "Confirmar eliminación"
- [ ] Mensaje: "¿Estás seguro de que deseas eliminar **[NOMBRE]**?"
- [ ] Botones: "Cancelar" y "Eliminar"

---

### Test 7.2: Cancelar Eliminación

1. [ ] Con modal de confirmación abierto
2. [ ] Click "Cancelar"

**✅ Resultado esperado**:

- [ ] Modal se cierra
- [ ] Producto NO se eliminó

---

### Test 7.3: Confirmar Eliminación

1. [ ] Click "Eliminar" en "Producto Test EDITADO"
2. [ ] En modal, click "Eliminar"

**✅ Resultado esperado**:

- [ ] Botón muestra "Eliminando..."
- [ ] Modal se cierra
- [ ] Producto desaparece INMEDIATAMENTE de la lista (optimistic)
- [ ] Contador actualiza

**✅ Verificación en Supabase**: 3. [ ] Ir a Table Editor → `products` 4. [ ] Buscar "Producto Test EDITADO" 5. [ ] **Resultado esperado**: NO existe el registro

---

### Test 7.4: Eliminar Producto Inactivo

1. [ ] Crear producto inactivo
2. [ ] Eliminarlo

**✅ Resultado esperado**:

- [ ] Se elimina correctamente
- [ ] Mismo comportamiento que producto activo

---

## MÓDULO 8: OPTIMISTIC UPDATES Y ROLLBACK

### Test 8.1: Simular Error en Crear

**Pre-condición**: Detener servidor o modificar API para forzar error

1. [ ] Detener servidor: `Ctrl+C`
2. [ ] Intentar crear producto
3. [ ] Click "Crear"

**✅ Resultado esperado**:

- [ ] Muestra mensaje de error
- [ ] Producto NO queda en la lista
- [ ] No se rompe la aplicación

---

### Test 8.2: Simular Error en Actualizar

1. [ ] Detener servidor
2. [ ] Intentar editar producto
3. [ ] Click "Actualizar"

**✅ Resultado esperado**:

- [ ] Muestra error
- [ ] Cambios se REVIERTEN (rollback)
- [ ] Producto vuelve a estado original

---

### Test 8.3: Simular Error en Eliminar

1. [ ] Detener servidor
2. [ ] Intentar eliminar producto
3. [ ] Confirmar eliminación

**✅ Resultado esperado**:

- [ ] Muestra error
- [ ] Producto REAPARECE en lista (rollback)

---

## MÓDULO 9: PERMISOS Y SEGURIDAD

### Test 9.1: Usuario Normal No Puede Ver Inactivos (API)

**Pre-condición**: Login como usuario normal (no admin)

1. [ ] Abrir DevTools → Console
2. [ ] Ejecutar:

```javascript
fetch('/api/products?includeInactive=true')
  .then((r) => r.json())
  .then(console.log);
```

**✅ Resultado esperado**:

- [ ] Retorna: `{ error: "Forbidden: Admin access required" }`
- [ ] Status: `403`

---

### Test 9.2: Usuario Normal No Puede Crear (API)

1. [ ] Como usuario normal, ejecutar en Console:

```javascript
fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Hack Test',
    price: 100,
    mainCategory: 'Almacen',
    image: 'https://example.com/img.jpg',
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

**✅ Resultado esperado**:

- [ ] Retorna: `{ error: "Forbidden: Admin access required" }`
- [ ] Status: `403`

---

### Test 9.3: Usuario Normal No Puede Actualizar (API)

1. [ ] Como usuario normal, ejecutar:

```javascript
fetch('/api/products/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Hacked' }),
})
  .then((r) => r.json())
  .then(console.log);
```

**✅ Resultado esperado**:

- [ ] Status: `403`

---

### Test 9.4: Usuario Normal No Puede Eliminar (API)

1. [ ] Como usuario normal, ejecutar:

```javascript
fetch('/api/products/1', { method: 'DELETE' })
  .then((r) => r.json())
  .then(console.log);
```

**✅ Resultado esperado**:

- [ ] Status: `403`

---

### Test 9.5: RLS Bloquea Escritura en Supabase

1. [ ] Como usuario normal, ir a Supabase SQL Editor
2. [ ] Intentar insertar directamente:

```sql
INSERT INTO products (name, price, main_category, image, active)
VALUES ('Hack', 100, 'Almacen', 'http://test.com/img.jpg', true);
```

**✅ Resultado esperado**:

- [ ] Error: "new row violates row-level security policy"

---

## MÓDULO 10: UI/UX Y RESPONSIVE

### Test 10.1: Mobile - Layout del Panel

1. [ ] Abrir DevTools
2. [ ] Cambiar a vista móvil (375px width)
3. [ ] Ir a `/admin/products`

**✅ Resultado esperado**:

- [ ] Header admin se adapta a mobile
- [ ] Botón "+ Crear Producto" ocupa todo el ancho
- [ ] Campo búsqueda ocupa todo el ancho
- [ ] Filtro ocupa todo el ancho
- [ ] Grid muestra 1 columna de productos
- [ ] Todo es legible y usable

---

### Test 10.2: Mobile - Modal de Crear/Editar

1. [ ] En mobile, click "+ Crear Producto"

**✅ Resultado esperado**:

- [ ] Modal ocupa casi toda la pantalla
- [ ] Formulario es scrolleable
- [ ] Campos tienen tamaño touch-friendly
- [ ] Botones son fáciles de presionar

---

### Test 10.3: Tablet - Grid Responsive

1. [ ] Cambiar a 768px (tablet)

**✅ Resultado esperado**:

- [ ] Grid muestra 2 columnas

2. [ ] Cambiar a 1024px (tablet landscape)

**✅ Resultado esperado**:

- [ ] Grid muestra 3 columnas

3. [ ] Cambiar a 1280px (desktop)

**✅ Resultado esperado**:

- [ ] Grid muestra 4 columnas

---

### Test 10.4: Imágenes de Productos

1. [ ] Verificar que todas las imágenes cargan

**✅ Resultado esperado**:

- [ ] Imágenes se muestran correctamente
- [ ] No hay imágenes rotas
- [ ] Si no hay imagen, muestra placeholder "Sin imagen"

---

### Test 10.5: Loading States

1. [ ] Con DevTools → Network, activar "Slow 3G"
2. [ ] Crear un producto

**✅ Resultado esperado**:

- [ ] Botón muestra "Guardando..."
- [ ] Botón está deshabilitado durante loading
- [ ] No se puede hacer doble submit

---

## MÓDULO 11: INTEGRACIÓN CON CATÁLOGO PÚBLICO

### Test 11.1: Productos Activos en Home

1. [ ] Ir a `/` (home público)
2. [ ] Ver catálogo de productos

**✅ Resultado esperado**:

- [ ] Muestra SOLO productos activos
- [ ] NO muestra productos inactivos
- [ ] Contador correcto

---

### Test 11.2: Toggle Refleja en Público

1. [ ] Como admin, desactivar un producto visible en home
2. [ ] Ir a home (refrescar si es necesario)

**✅ Resultado esperado**:

- [ ] Producto desaparece del catálogo público

3. [ ] Volver a activar el producto
4. [ ] Refrescar home

**✅ Resultado esperado**:

- [ ] Producto reaparece en catálogo

---

## RESUMEN DE TESTING

### Checklist Final

#### Autenticación

- [ ] Login email/password funciona
- [ ] Login Google OAuth funciona
- [ ] Perfil se crea automáticamente (email y OAuth)
- [ ] Sesión persiste
- [ ] Logout funciona

#### Roles y Permisos

- [ ] Usuario sin login no accede a admin
- [ ] Usuario normal no accede a admin
- [ ] Admin accede correctamente
- [ ] RLS bloquea operaciones no autorizadas
- [ ] API valida permisos correctamente

#### CRUD Productos

- [ ] Ver todos los productos (admin)
- [ ] Crear producto (validación + éxito)
- [ ] Editar producto (validación + éxito)
- [ ] Toggle active/inactive
- [ ] Eliminar producto

#### Búsqueda y Filtros

- [ ] Búsqueda por nombre funciona
- [ ] Filtro activos funciona
- [ ] Filtro inactivos funciona
- [ ] Búsqueda + filtro combinados funcionan

#### Optimistic Updates

- [ ] Create optimistic funciona
- [ ] Update optimistic funciona
- [ ] Delete optimistic funciona
- [ ] Rollback en errores funciona

#### UI/UX

- [ ] Mobile responsive
- [ ] Tablet responsive
- [ ] Desktop responsive
- [ ] Loading states
- [ ] Error messages
- [ ] Validación de formularios

#### Integración

- [ ] Productos activos visibles en home
- [ ] Productos inactivos ocultos en home
- [ ] Cambios se reflejan entre admin y público

---

## 📝 Formato de Reporte de Errores

Para cada error encontrado, reportar:

```
ERROR #X:
- Módulo: [número de módulo]
- Test: [número de test]
- Descripción: [qué se esperaba vs qué pasó]
- Pasos para reproducir:
  1. ...
  2. ...
- Captura de pantalla: [adjuntar si es posible]
- Console errors: [copiar errores de DevTools Console]
- Network errors: [copiar de DevTools Network si aplica]
```

---

¡Testing completo! Ejecuta todos los tests y reporta los errores encontrados.
