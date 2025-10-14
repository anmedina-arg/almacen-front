# Backend para La Proveeduría

## Arquitectura Implementada

### 1. API Routes de Next.js

- **`/api/products`** - Gestión de productos
- **`/api/categories`** - Gestión de categorías
- **`/api/orders`** - Gestión de pedidos
- **`/api/orders/[id]`** - Operaciones específicas de pedidos

### 2. Servicios y Hooks

- **`src/services/api.ts`** - Cliente para llamadas a la API
- **`src/hooks/useApi.ts`** - Hooks personalizados para manejar estado de API
- **`src/hooks/useCart.ts`** - Hook para gestión del carrito

### 3. Componentes

- **`ProductListContainer`** - Actualizado para usar API
- **`AdminPanel`** - Panel de administración de pedidos
- **Página de admin** - `/admin` para gestión

## Características Implementadas

### ✅ API REST Completa

- CRUD para productos, categorías y pedidos
- Filtrado y paginación
- Manejo de errores
- Validación de datos

### ✅ Gestión de Estado

- Hooks personalizados para API
- Estado de carga y errores
- Cache y optimización

### ✅ Panel de Administración

- Lista de pedidos
- Cambio de estado de pedidos
- Filtrado por estado
- Detalles de pedidos

### ✅ Integración Frontend

- Carga de productos desde API
- Manejo de errores en UI
- Estados de carga

## Próximos Pasos para Base de Datos Real

### Opción 1: PostgreSQL con Prisma

```bash
npm install prisma @prisma/client
npx prisma init
npx prisma migrate dev
npx prisma generate
```

### Opción 2: MySQL con Sequelize

```bash
npm install sequelize mysql2
npm install -D @types/sequelize
```

### Opción 3: SQLite (más simple)

```bash
npm install sqlite3 better-sqlite3
```

### Opción 4: Supabase (Backend as a Service)

```bash
npm install @supabase/supabase-js
```

## Variables de Entorno Necesarias

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/almacen_db"

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER="5491112345678"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Estructura de Base de Datos

```sql
-- Productos
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    active BOOLEAN DEFAULT true,
    categories VARCHAR(100)
);

-- Pedidos
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items del pedido
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);
```

## Cómo Usar

### 1. Desarrollo Local

```bash
npm run dev
```

### 2. Acceder al Panel de Admin

```
http://localhost:3000/admin
```

### 3. API Endpoints

```
GET /api/products - Listar productos
GET /api/categories - Listar categorías
POST /api/orders - Crear pedido
GET /api/orders - Listar pedidos
PUT /api/orders/[id] - Actualizar pedido
DELETE /api/orders/[id] - Eliminar pedido
```

## Beneficios de esta Arquitectura

1. **Escalabilidad** - Fácil agregar nuevas funcionalidades
2. **Mantenibilidad** - Código organizado y modular
3. **Rendimiento** - Optimizaciones y cache
4. **Seguridad** - Validación y manejo de errores
5. **Flexibilidad** - Fácil cambiar de base de datos

## Próximas Mejoras

- [ ] Implementar base de datos real
- [ ] Autenticación y autorización
- [ ] Notificaciones por email/SMS
- [ ] Dashboard con estadísticas
- [ ] Exportación de reportes
- [ ] Integración con sistemas de pago
- [ ] Cache con Redis
- [ ] Logs y monitoreo
