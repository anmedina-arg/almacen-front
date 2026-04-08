# Spec — Dashboard de Rotación: Vista por Segmentos

## Contexto

El dashboard actual en `/admin/dashboard` muestra una tabla plana de todos los productos
ordenados por rotación. Esta spec agrega una vista de navegación por segmentos encima de
esa tabla, sin reemplazarla — la tabla existente pasa a ser el nivel 3 de la navegación.

---

## Ventanas temporales

Reemplazar el selector actual (7 / 15 / 30 días) por exactamente **dos botones**:

```
[ 7 días — Operativo ]    [ 30 días — Estratégico ]
```

- Default: 7 días
- El botón activo tiene estilo diferenciado (ya existe el patrón en el componente actual)
- Al cambiar la ventana, todos los niveles de navegación se actualizan

---

## Segmentos y umbrales

Estos umbrales son fijos e independientes de la ventana seleccionada:

| Segmento | Nombre | Condición | Color sugerido |
|---|---|---|---|
| 1 | Stock roto | `rotación > 2x` | Rojo |
| 2 | Saludable | `0.3x <= rotación <= 2x` | Verde |
| 3 | Baja rotación | `0x < rotación < 0.3x` | Amarillo |
| 4 | Sin ventas | `rotación = 0x` | Gris |

---

## Arquitectura de navegación — 3 niveles

### Nivel 1 — Tarjetas de segmento (vista principal)

4 tarjetas, una por segmento. Cada tarjeta muestra:
- Nombre del segmento
- Cantidad de productos en ese segmento
- Porcentaje sobre el total de productos activos
- Color identificador del segmento

Ejemplo visual:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Stock roto     │  │   Saludable     │  │ Baja rotación   │  │   Sin ventas    │
│  rotación > 2x  │  │  0.3x — 2x      │  │  0x — 0.3x      │  │  rotación = 0x  │
│                 │  │                 │  │                 │  │                 │
│   11 productos  │  │  117 productos  │  │  62 productos   │  │  100 productos  │
│      (3%)       │  │     (32%)       │  │     (17%)       │  │     (24%)       │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

Al hacer click en una tarjeta → navegar al Nivel 2.

---

### Nivel 2 — Productos agrupados por categoría dentro del segmento

- Breadcrumb en el encabezado: `Rotación de Inventario › Stock roto`
- Botón o flecha para volver al Nivel 1
- Lista de categorías presentes en ese segmento, cada una como un bloque colapsable o sección

Cada sección de categoría muestra:
- Nombre de la categoría
- Cantidad de productos en esa categoría dentro del segmento
- Lista resumida de productos (nombre + rotación + nivel)

Al hacer click en una categoría → navegar al Nivel 3.

---

### Nivel 3 — Tabla de detalle por categoría

- Breadcrumb: `Rotación de Inventario › Stock roto › Bebidas`
- Botón para volver al Nivel 2
- La tabla existente (`InventoryRotationTable`) filtrada por:
  - El segmento seleccionado
  - La categoría seleccionada
- Mantener el botón de exportar CSV (ya implementado)
- Mantener las columnas actuales: `#` · `Producto` · `Categoría` · `Ventas` · `Stock prom.` · `Rotación` · `Nivel`

---

## Implementación

### Componente nuevo: `InventoryRotationDashboard.tsx`

Este componente es el contenedor principal que maneja la navegación entre los 3 niveles.
Reemplaza la invocación directa de `InventoryRotationTable` en el dashboard.

Estado interno:
```ts
type View =
  | { level: 1 }
  | { level: 2; segment: SegmentKey }
  | { level: 3; segment: SegmentKey; category: string }

type SegmentKey = 'stock_roto' | 'saludable' | 'baja_rotacion' | 'sin_ventas'
```

Lógica de segmentación (calcular en el componente a partir de los datos del hook):
```ts
const SEGMENTS = {
  stock_roto:      (r: number) => r > 2,
  saludable:       (r: number) => r >= 0.3 && r <= 2,
  baja_rotacion:   (r: number) => r > 0 && r < 0.3,
  sin_ventas:      (r: number) => r === 0,
}
```

El componente usa el hook existente `useInventoryRotation(days)` — no crear un hook nuevo.

### Selector de ventana temporal

Reemplazar el selector actual por dos botones solamente:
```ts
const WINDOWS = [
  { days: 7,  label: '7 días',  sublabel: 'Operativo' },
  { days: 30, label: '30 días', sublabel: 'Estratégico' },
]
```

### No modificar

- `InventoryRotationTable.tsx` — usarlo tal cual en el Nivel 3, solo pasarle los datos
  ya filtrados por segmento y categoría
- `useInventoryRotation.ts`
- `route.ts` de la API
- Ningún otro componente del dashboard

---

## Consideraciones de UX

- El breadcrumb debe ser clickeable en cada nivel para navegar hacia atrás
- Al cambiar la ventana temporal desde cualquier nivel, volver al Nivel 1
- Las tarjetas del Nivel 1 deben mostrar un estado de carga (skeleton) mientras
  `isLoading` es true
- Si `isError` es true, mostrar mensaje de error en lugar de las tarjetas
- Usar el mismo sistema de estilos (Tailwind / shadcn) que el resto del dashboard

---

## Checklist de validación

- [ ] Las 4 tarjetas muestran conteos correctos que suman el total de productos activos
- [ ] Al cambiar entre 7 y 30 días, los conteos cambian correctamente
- [ ] La navegación breadcrumb funciona en los dos sentidos
- [ ] El Nivel 3 muestra solo los productos del segmento y categoría seleccionados
- [ ] El CSV exportado desde el Nivel 3 incluye solo los productos visibles
- [ ] Cambiar la ventana temporal desde el Nivel 2 o 3 vuelve al Nivel 1
