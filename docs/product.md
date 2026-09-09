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
- **Actualizar afinidad**: botón para recalcular la matriz de recomendaciones manualmente (ver deuda técnica en issue #132 — hoy es 100% manual)

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
| Sistema de recomendaciones | ✅ Completo (deuda técnica en issues #131/#132/#134) |
| Reglas de afinidad por categoría | ✅ Implementado — configuración solo por SQL (issue #131) |

Deuda técnica conocida: ver issues [#129](https://github.com/anmedina-arg/almacen-front/issues/129)-[#135](https://github.com/anmedina-arg/almacen-front/issues/135).
