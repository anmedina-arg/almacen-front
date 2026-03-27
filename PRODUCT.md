# Market Cevil — Resumen del Producto

## ¿Qué hace la app?

Market Cevil es un sistema de ventas para un almacén / rotisería que opera principalmente por WhatsApp. La app tiene dos partes:

**Catálogo público** — Los clientes acceden desde el celular, navegan los productos, arman su pedido y lo envían por WhatsApp con un solo toque. El mensaje ya viene formateado con el detalle del pedido.

**Panel de administración** — El dueño gestiona todo desde `/admin`: confirma pedidos, controla stock, ve las ventas, analiza rankings y descarga reportes.

---

## Features

### Catálogo público
- Navegación por categorías y subcategorías con scroll y filtro de búsqueda
- Soporte para distintos tipos de venta: unidad, kg, 100gr
- Control de stock visible: botón deshabilitado cuando no hay stock
- Badge **"Más vendido"** por subcategoría (top 3, últimos 30 días), calculado con `DENSE_RANK`
- Los más vendidos aparecen primero dentro de su subcategoría
- Carrito con Zustand: selectores granulares para evitar re-renders
- Generación automática del mensaje de WhatsApp formateado
- **Sistema de recomendaciones** en el modal de confirmación: sugiere productos basados en co-ocurrencia histórica, reglas de categoría configurables y fallback a top vendidos

### Pedidos (`/admin/orders`)
- Tabla de todos los pedidos con filtros combinables:
  - **Fecha**: Hoy / Últimos 7 días / Este mes / Rango personalizado
  - **Estado**: Pendiente / Confirmado / Cancelado
  - **Cliente**: por código de cliente o "sin asignar"
  - **Pago**: "Debe" (órdenes sin pago o con saldo pendiente)
  - **Búsqueda**: por ID, total o nombre de producto dentro del pedido
- Contadores de pendientes y "debe" actualizados al rango de fechas seleccionado
- Asignación de cliente inline: barrios AC1 / AC2 / Otros (con descripción libre)
- Registro de métodos de pago inline: efectivo 💵 / transferencia 📱
- Soporte de **pagos parciales**: indicar cuánto debe el cliente
- Badge de balance: muestra "Debe $X" o "A favor $X" según el saldo
- Modal de detalle con ítems, totales y margen
- Confirmación de pedidos desde el panel

### Ventas (`/admin/sales`)
- Vista de historial de pedidos confirmados con desglose financiero
- Filtros de fecha idénticos a Pedidos
- Resumen: total facturado, costo, margen y cantidad de pedidos
- Tabla con cliente, método de pago y margen por orden

### Stock (`/admin/stock`)
- Ajustes manuales de inventario por producto
- Historial completo de movimientos con timestamp
- Vista de productos sin stock registrado

### Ranking (`/admin/ranking`)
- Toggle **Por producto** / **Por categoría**
- Por producto: rank por unidades vendidas o facturación, con filtro de categoría
- Por categoría: solo por facturación
- Períodos: Hoy / Esta semana / Este mes / Rango personalizado
- Top N configurable: 10 / 15 / 20 / 25

### Informes (`/admin/informes`)
- **CSV de ventas**: detalle de órdenes e ítems con cliente, pago, saldo, categoría, subtotal, costo y margen. Filtrable por rango de fechas
- **CSV de productos**: catálogo completo con precio, costo, márgenes, categoría, subcategoría y stock
- **Actualizar afinidad**: botón para recalcular la matriz de recomendaciones manualmente

### Productos (`/admin/products`)
- Alta, edición y baja de productos
- Soporte de combos: productos compuestos de otros productos con stock virtual calculado automáticamente
- Gestión de categorías y subcategorías
- Backfill automático de `unit_cost` en órdenes pendientes al actualizar el precio de costo

---

## Estado de implementación

| Feature | Estado |
|---------|--------|
| Catálogo público + carrito | ✅ Completo |
| Flujo WhatsApp (iOS + Android) | ✅ Completo |
| Pedidos — tabla y filtros | ✅ Completo |
| Pedidos — asignación de cliente | ✅ Completo |
| Pedidos — pagos y saldo | ✅ Completo |
| Ventas — historial y resumen | ✅ Completo |
| Stock — ajuste e historial | ✅ Completo |
| Combos — stock virtual | ✅ Completo |
| Ranking de productos y categorías | ✅ Completo |
| Informes CSV | ✅ Completo |
| Badge "Más vendido" | ✅ Completo |
| Sistema de recomendaciones | ✅ Completo (ver deuda técnica) |
| Reglas de afinidad por categoría | ✅ Implementado — configuración solo por SQL |

---

## Deuda técnica

### Alta prioridad

**Inconsistencia histórica en `quantity` de órdenes antiguas**
Antes de la migración a Zustand, algunas órdenes tienen `quantity = 1` significando 1 kg, en lugar de `quantity = 1000` (gramos). El ranking y los informes asumen gramos, por lo que esas órdenes muestran valores incorrectos. No hay forma de corregir masivamente sin riesgo de romper datos válidos.

**Órdenes sin registro de stock**
Algunos productos (especialmente combos) no tenían stock registrado, lo que causaba errores `409 insufficient_stock` al intentar crear una orden. Se resolvió caso a caso; puede reaparecer con productos nuevos que no tengan stock cargado.

### Media prioridad

**Reglas de afinidad por categoría — solo por SQL**
La tabla `category_affinity_rules` (ej: "bebidas → snacks siempre") se administra directamente desde el SQL Editor de Supabase. No hay UI para gestionar estas reglas desde el panel de admin.

**Actualización de afinidad — solo manual**
El botón "Actualizar afinidad" en Informes debe ejecutarse manualmente. No hay actualización automática (se descartó `pg_cron` por limitaciones del plan de Supabase). Debería ejecutarse periódicamente a medida que crecen las ventas.

**`supabase_ranking.sql` — pendiente validar en producción**
Las funciones `get_top_products` y `get_top_categories` fueron ejecutadas pero no se tiene confirmación de que el ranking funcione correctamente con el volumen real de datos de producción.

### Baja prioridad

**Columna `category_name` en AdminProductList**
Muestra `category_name` (sistema FK nuevo) con fallback a `mainCategory` (campo legacy). Debería migrarse completamente al sistema nuevo una vez que todos los productos tengan `category_id` asignado.

**`from_suggestion` — tracking sin análisis**
El campo `from_suggestion` en `order_items` registra si un producto fue agregado desde sugerencias, pero no hay ninguna vista o reporte que use ese dato todavía.

**Precio de costo faltante en muchos productos**
Varios productos activos no tienen `cost` cargado (`NULL` o `0`), lo que hace que el margen se muestre como `—` en las vistas de admin. Esto afecta la utilidad del ranking por facturación y los informes de rentabilidad.
