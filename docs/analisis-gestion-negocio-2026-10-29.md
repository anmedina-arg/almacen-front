# Análisis de negocio: ¿chaskyapp le sirve a un almacén para manejarse económicamente?

> Análisis severo, solo lectura, hecho el 2026-10-29 sobre la branch `dev` (último commit `af7436b`).
> Pregunta: un dueño con TODAS las feature flags activadas, ¿puede saber su margen de ganancia real y tomar decisiones (qué reponer, cuánto cobrar, si gana o pierde plata)?
> Es una foto de ese momento y una referencia de mejoras, no un spec. Rutas relativas a la raíz del repo.
>
> Verificado a mano después del análisis: `useSalesFilters` no filtra por status; `getOrders()` da margen 100 % con costo 0; el trigger `sync_order_items_unit_cost` solo filtra `unit_cost = 0` (sin status ni fecha); 0 menciones de gasto/alquiler/sueldo/expense en `src/`, `supabase/`, `docs/`.

## Veredicto

**No.** Con las 7 flags prendidas (`stock, clientes, pagos, ranking, pos, dashboard, informes` — `src/lib/store/featureFlags.ts`), un dueño puede ver un **margen bruto aproximado por pedido y por período**, y poco más. No puede saber si gana o pierde plata: no existe ningún concepto de gasto, costo fijo, compra con precio, cobranza con fecha ni resultado del período. Y el margen bruto que sí se muestra tiene cuatro defectos que lo vuelven poco confiable para decidir: suma pedidos cancelados y pendientes como "ventas", trata costo 0 como ganancia del 100 %, un trigger pisa el costo histórico con el costo de hoy sin límite de fecha, y el ranking calcula margen a precio/costo actual en vez del de la venta.

## Tabla de capacidades

| Capacidad | Veredicto | Evidencia | Qué falta |
|---|---|---|---|
| 1. Costo variable por producto | **PARCIAL** | `products.cost NUMERIC(12,2) NOT NULL DEFAULT 0` (`supabase/schema/products/products.sql`); snapshot en venta `order_items.unit_cost` calculado server-side como `unit_price * (cost/price)` (`src/features/orders/services/orderService.ts:110`); historial append-only `product_price_history` por trigger `log_price_change` (`supabase/schema/orders/`); combos suman componentes (`supabase/schema/combos/sync_combo_cost.sql`) | Un solo número que se pisa (sin lote, sin promedio ponderado). Ingreso de stock (`increment_product_stock`, movement_type `'purchase'`) registra **cantidad y nota, nunca precio ni proveedor**: `stock_movement_log` no tiene columna de costo. No hay tabla de proveedores ni de compras. `product_price_history` se escribe pero **nadie la lee** en `src/` (solo tests de integración). |
| 2. Precios | **NO** | `ProductFormModal.tsx:184-205` muestra "Precio de compra (costo)" y "Margen: $X" (diferencia absoluta). `PUT /api/products/[id]` edita de a uno. | Sin margen objetivo, sin precio sugerido, sin markup configurable, **sin actualización masiva por porcentaje**. En Argentina esto es la operación más frecuente. Historial de precios existe en la base pero no hay pantalla. |
| 3a. Margen bruto | **PARCIAL** | Por orden: `orderService.getOrders()` líneas 45-53 → `OrdersTable`, `SalesTable`, `SalesSummary` (período). Por ítem en CSV: `supabase/schema/recomendaciones/export_ventas.sql:73-79` (usa `unit_cost` snapshot, correcto). Por producto: `get_top_products.sql:38-47`. | Ver "Riesgos". Por categoría solo facturación, sin costo (`get_top_categories.sql`). Dos definiciones distintas de "margen %": sobre venta en Ventas/CSV ventas, **sobre costo** (markup) en Ranking y CSV productos (`get_top_products.sql:46`, `export_productos.sql:39`). |
| 3b. Margen neto / costos fijos | **NO** | grep `gasto`, `alquiler`, `sueldo`, `impuesto`, `expense`, `costo fijo` en `src/`, `supabase/`, `docs/` → **0 resultados** (la única "merma" es el label de un tipo de movimiento de stock en `src/features/admin/constants/stock.ts:7`). | Todo: tabla de gastos, categorías de gasto, periodicidad, impuestos, logística, resultado = margen bruto − gastos. |
| 4. Reposición | **PARCIAL** | `product_stock.min_stock` + `get_low_stock_products.sql` + botón "Alertas de stock bajo" con contador (`StockManagement.tsx:136-152`). Rotación `units_sold / avg_stock` a 7/30 días con segmentos (`dashboardService.getRotation`, `InventoryRotationDashboard.tsx:19-60`). Ingreso por lote `increment_product_stock_batch`. | Sin cantidad sugerida a reponer, sin órdenes de compra, sin proveedores, sin vencimientos. Mermas: `movement_type='loss'` en unidades, **sin valorización ni reporte**. La alerta de mínimo es pasiva (solo al entrar a `/admin/stock`). Combos sin fila en `product_stock` rompen la venta (#130). |
| 5. Ventas y cobranzas | **PARCIAL** | `/admin/sales` = `SalesTab` → `useOrders()` (todas las órdenes) + `useSalesFilters` (**solo fecha**, `useSalesFilters.ts:63-74`). Pagos: `order_payments` (efectivo / transferencia, `amount` nullable, `UNIQUE(order_id, method)`). "Debe" derivado en `orderDebe()`. POS (`/admin/pos`) crea órdenes con `notes='Venta directa'` vía el mismo `createOrder`. | **Ventas incluye `cancelled` y `pending`** (`docs/product.md` dice "pedidos confirmados"). Sin cuenta corriente por cliente, sin fecha de cobro distinta de `created_at`, sin pagos fuera de un pedido. `clients` con CHECK hardcodeado `barrio IN ('AC1','AC2','otros')` y regex de lote (`supabase/schema/clients/clients.sql`): modela el barrio de Market Cevil, no otro negocio; sin nombre ni teléfono. POS sin descuentos, sin precio manual, sin ticket, sin cierre de caja. `PendingPaymentsTable` filtra hardcodeado desde `2026-03-20` (`dashboardService.ts:42`). |
| 6. Reportes / tablero | **PARCIAL** | Dashboard (`DashboardPanel.tsx`): pendientes de pago, valor de stock al costo últimos 7 días (`get_stock_value_per_day`), stock por categoría, rotación. Ranking top N. Informes: CSV ventas por ítem y CSV productos (`InformesPanel.tsx`, `reportsService.ts`). | **El dashboard no tiene ni un KPI de ventas ni de margen.** Sin comparación entre períodos, sin tendencia. |
| 7. Resultado / flujo de caja del período | **NO** | `SalesSummary.tsx:12-18`: Ventas − Costo de lo vendido del rango. | Es margen bruto (y contaminado), no caja. Nada dice "este mes ganaste X". |
| 8. Integridad del dato | **BAJA para decidir** | Ver "Riesgos". | — |

## Lo que el producto promete vs lo que entrega

Fuente: `src/app/page.tsx`, `src/features/landing/components/Hero.tsx`, `src/features/landing/constants/modules.ts`, `docs/product.md`.

| Promesa | Realidad |
|---|---|
| H1: **"Del pedido de WhatsApp a la caja cerrada."** | No hay caja: ni arqueo, ni cierre, ni ingresos/egresos, ni cobrado-vs-facturado con fecha. |
| "también lleva tu stock, tus precios, tus clientes y **tus cuentas**" / módulo 104 "Clientes y cuentas: cuánto debe" | Saldo **por pedido** sí. Cuenta corriente por cliente no: hay que filtrar en Pedidos por cliente + "Debe" y sumar a mano. |
| Módulo 101: "Sabés cuánto ganás en cada pedido." | Margen bruto, si cargaste costo. Si no, te dice que ganás el 100 % en verde. |
| Módulo 101: "Si corregís un costo, se actualiza en los **pedidos pendientes**." | El trigger `sync_order_items_unit_cost` actualiza **todos** los `order_items` con `unit_cost = 0` de ese producto, sin filtro de status ni fecha. |
| Módulo 106: "**En qué productos estás perdiendo plata.**" | Ranking con margen unitario a precio y costo **actuales**, no del período. Ignora mermas y devoluciones. |
| Módulo 108: "Facturación, costo y margen del período." | Existe (`SalesSummary`), pero suma canceladas y pendientes. |
| `docs/product.md`: "**Gestión completa del negocio**" | Gestión completa del *pedido*, no del *negocio*. Falta todo el lado de egresos. |
| `docs/product.md`: "Ventas: historial de pedidos **confirmados**" | Falso en el código: `SalesTab` no filtra por status. |

## Brechas críticas, ordenadas por impacto en "¿gano o pierdo?"

1. **Ventas suma canceladas y pendientes.** Bug de definición que invalida el único KPI financiero de período. (Ranking excluye `cancelled` pero incluye `pending`.)
2. **No existe el concepto de gasto.** Sin alquiler, sueldos, servicios, impuestos, fletes, comisiones. Para un almacén de barrio los costos fijos deciden si un margen bruto del 30 % es ganancia o pérdida.
3. **Costo 0 = ganancia 100 %.** `getOrders` hace `total_cost ?? 0`; un pedido de productos sin costo aparece con margen 100 % en verde (`OrdersTable.tsx:316-323`, `SalesTable.tsx:72-78`). El ranking sí lo marca "sin costo"; Pedidos y Ventas no. Ver #135.
4. **Compras sin precio.** El ingreso de stock no captura precio de compra. Con inflación mensual, el `cost` cargado hace 3 meses sobreestima el margen de todo lo vendido desde entonces.
5. **Backfill retroactivo sin tope.** Cargar hoy el costo de un producto vendido 8 meses con `unit_cost = 0` aplica el costo de hoy a todas esas ventas: margen negativo ficticio en el histórico. Y las que ya tenían `unit_cost > 0` nunca se corrigen aunque estuvieran mal.
6. **Mermas sin valor.** `'loss'` existe, pero nadie multiplica `change_qty × cost` ni lo resta de nada.
7. **Cobranza sin fecha ni cuenta corriente.** `order_payments.created_at` es cuando se anotó, no cuando se cobró; no hay "pagó $5.000 a cuenta de tres pedidos". Imposible armar flujo de caja.
8. **Sin actualización masiva de precios.**
9. **Dos definiciones de "margen %".** Un 50 % en Ventas es un 33 % en Ranking.

## Lo que sí sirve hoy

- **Snapshot de `unit_cost` por ítem** (`create_order.sql:109`, `orderService.ts:110`): base correcta para margen bruto histórico. El **CSV de ventas** (`export_ventas.sql`) lo expone por ítem con cliente, pago, saldo, costo y margen.
- **Stock mínimo con alerta** y **rotación a 7/30 días**.
- **Valor de stock al costo** por categoría y su evolución (`get_stock_value_per_day`), respetando kg/100gr/unit.
- **Saldo por pedido** y lista de pendientes de pago en el dashboard.
- **POS**: la venta de mostrador entra al mismo flujo.
- `product_price_history` ya acumula datos; falta la pantalla.

## Riesgos de decidir con lo que la app SÍ muestra

- **Empujar productos con margen negativo real**: ranking por facturación con margen a costo actual, desactualizado o en 0.
- **Creer que el mes cerró bien** porque "Margen" en Ventas está en verde (incluye canceladas, pendientes, productos sin costo al 100 %, cero gastos).
- **Fijar precios con el "Margen: $X" del formulario**: diferencia absoluta a costo congelado, sin %, sin objetivo, sin merma.
- **Comparar márgenes entre pantallas** (Ventas vs Ranking) con fórmulas distintas.
- **Juzgar el histórico tras cargar un costo tarde**: el backfill reescribe el pasado.
- **Rotación engañosa en productos por peso** con datos viejos (#129): `quantity=1` significando 1 kg deprime `units_sold`.
- **Promociones a precio 0** se registran con `unit_cost = 0` (`orderService.ts:104-110`): el regalo no cuesta nada según la app.
- **Clientes**: el modelo barrio/manzana/lote es de un solo barrio; para otra Store no modela su realidad.

## Lectura de la hipótesis (falta agregar costos fijos)

**Correcta en la conclusión, corta en el diagnóstico.** No hay costos fijos, gastos ni resultado del período, y la landing promete exactamente eso.

Pero aunque se agregue una tabla de gastos, el margen bruto sobre el que se restaría no es confiable hoy: suma canceladas, trata costo faltante como ganancia, reescribe el histórico, no captura precio de compra, no valoriza mermas y usa dos fórmulas de %. Del lado de ingresos tampoco está lo cobrado con fecha, así que no hay caja ni con gastos agregados.

### Mínimo indispensable, en orden

1. Ventas = solo confirmadas.
2. Costo faltante = "sin dato", nunca 100 %.
3. Acotar el backfill de `unit_cost` a pendientes.
4. Compras con precio que actualicen `cost` (o promedio ponderado) y valorización de mermas.
5. Gastos del período y "Resultado = margen bruto − gastos".
6. Cobros con fecha y saldo por cliente.
7. Una sola definición de margen %.

No todo está perdido: el snapshot de costo por ítem y el CSV de ventas son una base real. Margen bruto confiable más un número de gastos fijos mensuales ya sería una primera aproximación honesta. Hoy se puede hacer afuera con el CSV; adentro, no.

## No verificado

- Cuántos productos tienen `cost = 0` en producción (según la auditoría del 2026-10-17 en Notion/#135: 33 activos, 13 de market-del-cevil y 20 de yo-heladerias).
- Cuántas órdenes viejas afecta #129 (según la misma auditoría: 21 ítems en 15 órdenes).
- Si en producción `trg_sync_order_items_cost` está exactamente como el canónico.

## Issues relacionados

#135 (costo faltante), #129 (quantity kg vs gramos), #130 (stock nunca cargado), #134 (`from_suggestion` sin lector), #96 (checkout falla en silencio).
