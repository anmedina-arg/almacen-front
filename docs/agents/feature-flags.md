# Feature flags: verificación de independencia

Checklist obligatorio al agregar o tocar una capacidad gateada por una feature flag (`stores.feature_flags`, ver [ADR-0007](../adr/0007-feature-flags-db-column.md) para dónde viven y [ADR-0012](../adr/0012-feature-flags-mutual-independence.md) para por qué esto importa: las flags existen para vender suscripciones por módulo, así que apagar una nunca puede romper ni degradar otra, ni ninguna capacidad siempre-encendida — catálogo, productos, pedidos/WhatsApp, ventas).

## Los 3 pasos

1. **Mapear qué lee y qué escribe la capacidad nueva/tocada.** Para cada tabla/RPC que toca, preguntar: ¿algo siempre-encendido, o gateado por *otra* flag, lee o escribe esto mismo? Si la respuesta es sí, hay una dependencia — clasificarla:
   - **Accidental** (se puede independizar): la otra capacidad no necesita realmente este dato, solo lo asumía disponible. Ejemplo resuelto: `create_order()` asumía que `product_stock` siempre existía, aunque `stock` sea una flag distinta y siempre-encendida "pedidos" no debería depender de ella (#97).
   - **Inherente** (no se puede independizar sin rediseñar el concepto): la capacidad B literalmente se define en términos de A. Ejemplo: el stock virtual de un combo se calcula a partir del stock de sus componentes — no hay una definición sensata de "stock de combo" sin stock. Estas no se "arreglan" fingiendo independencia — se documentan como tales (ver Consequences de ADR-0012) y, si generan fricción real de producto, se resuelven a nivel de catálogo/modelo de datos (ej. si `combos` deja de ser flag), no forzando un chequeo que no tiene sentido.

2. **Para cada dependencia accidental, definir el comportamito con la flag apagada — no solo "no rompas".** "Apagado" tiene que resolver a un comportamiento explícito y sensato, no a un estado indefinido. Ejemplos ya resueltos en este repo:
   - `stock: false` → la operación se trata como "siempre disponible", sin chequeo ni escritura (#97) — no "stock en cero" (eso bloquearía ventas), no "sin validar" (dejaría pasar datos corruptos en otro sentido).
   - `pagos: false` → el widget/columna que depende de pagos se oculta por completo (mismo patrón que `clientes`/`pagos` en `OrdersTable`, #23) — no se muestra un dato parcial o por default que pueda leerse como real.

3. **Implementar el chequeo server-side, en un solo lugar por regla.** Si la regla se necesita desde más de un caller (ej. `create_order()` y `adjust_stock_on_item_update()` ambas necesitan saber si el Store trackea stock), no repetir la lógica de leer `feature_flags` en cada uno — crear una función SQL dedicada y específica de esa regla (ej. `is_stock_tracked(p_store_id)`), mismo criterio que `is_store_admin()` para autorización. No crear una función genérica "chequear cualquier flag por nombre" de antemano — se arma una función nueva y específica cuando una regla real la necesita, no antes (YAGNI: evita el riesgo de que una función genérica termine escondiendo *qué* regla de negocio depende de qué flag).

## Gating de UI (cliente)

Para piezas de UI (nav, botones, columnas de tabla, widgets) — no reglas de negocio en la base — el patrón ya establecido es: resolver las flags una vez server-side (`getStoreFeatureFlags`, cache() por request) en el layout más cercano, pasarlas a los client components vía `FeatureFlagsContext` (`useFeatureFlags()`), y ocultar condicionalmente. Ver `src/features/admin/components/AdminTabBar.tsx`, `AdminProductList.tsx`, `orders/OrdersTable.tsx` como referencia. Nunca resolver flags con un fetch aparte desde un client component si ya están disponibles en el Context de esa parte del árbol.

## Al cerrar el ticket

Si el checklist reveló una dependencia inherente entre dos flags, o una capacidad que en realidad no debería ser flag (candidata a ser siempre-encendida o parte de otra), no la resuelvas de paso — abrí un issue liviano (`needs-triage`) documentando el hallazgo, para tratarlo en su propia sesión de grilling. Ver ADR-0012 para dos ejemplos ya abiertos así (#98, #99).
