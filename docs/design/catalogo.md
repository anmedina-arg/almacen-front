---
name: chaskyapp catálogo
description: La góndola ordenada. Catálogo mobile del comprador, blanco y verde oscuro, filas limpias, controles grandes y una barra de pedido fija abajo.
colors:
  shelf-white: "#ffffff"
  ink: "#111827"
  action-green: "#15803d"
  action-green-deep: "#166534"
  selected-green: "#16a34a"
  selected-wash: "#f0fdf4"
  aisle-slate: "#1f2937"
  aisle-slate-text: "#f9fafb"
  label-gray: "#6b7280"
  rule-gray: "#e5e7eb"
  footer-wash: "#f9fafb"
  stock-out-red: "#ef4444"
  limit-orange: "#f97316"
  demo-amber: "#fbbf24"
  demo-amber-ink: "#451a03"
typography:
  store-name:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  section:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
  product-name:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  price:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
  quantity:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
  action:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  cart-total:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
rounded:
  badge: "6px"
  card: "8px"
  chip: "12px"
  add-pill: "22px"
  circle: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  product-row:
    backgroundColor: "{colors.shelf-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  product-row-selected:
    backgroundColor: "{colors.selected-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  quantity-plus:
    backgroundColor: "{colors.action-green}"
    textColor: "{colors.shelf-white}"
    rounded: "{rounded.circle}"
    size: "44px"
  quantity-minus:
    backgroundColor: "{colors.shelf-white}"
    textColor: "{colors.action-green-deep}"
    rounded: "{rounded.circle}"
    size: "44px"
  add-pill:
    backgroundColor: "{colors.shelf-white}"
    textColor: "{colors.action-green-deep}"
    typography: "{typography.action}"
    rounded: "{rounded.add-pill}"
    height: "44px"
  header-action:
    textColor: "{colors.action-green}"
    typography: "{typography.action}"
    height: "44px"
  category-chip-active:
    backgroundColor: "{colors.aisle-slate}"
    textColor: "{colors.aisle-slate-text}"
    rounded: "{rounded.chip}"
  cart-bar:
    backgroundColor: "{colors.shelf-white}"
    textColor: "{colors.ink}"
  send-button:
    backgroundColor: "{colors.action-green}"
    textColor: "{colors.shelf-white}"
    rounded: "{rounded.chip}"
    height: "48px"
  demo-banner:
    backgroundColor: "{colors.demo-amber}"
    textColor: "{colors.demo-amber-ink}"
---

# Design System: chaskyapp catálogo

> Superficie: catálogo público del comprador en `/{store}`. La landing de chaskyapp tiene su propio sistema en `DESIGN.md` en la raíz del repo. **Decidido por Andrés el 2026-11-03: el catálogo y la landing no comparten identidad.** No mezclar los dos.
>
> **Este documento describe el destino, no el estado actual del código.** El destino es el prototipo A elegido por Andrés el 2026-11-03 (barra de pedido inferior fija), tomado como primer prototipo base que se va a seguir mejorando. Reglas para leerlo:
> - Lo que el prototipo A cambia se documenta como destino.
> - Lo que Andrés decidió conservar (foto de producto de 80 px, tarjeta de 8 px, botón de lista y grilla, imagen en cada categoría) se documenta como destino aunque el prototipo lo muestre distinto o no lo muestre.
> - Lo que el prototipo no modela queda en "Pendiente de prototipar", con el comportamiento actual del código.
> - El código todavía no implementa nada de esto. Ver "Estado anterior" para lo que hoy existe.
>
> Prototipo de referencia, descartable y fuera del repo: `scratchpad/prototipo-catalogo/index.html` de la sesión del 2026-11-03.

## Overview

**Creative North Star: "La góndola ordenada"**

El catálogo se recorre como los pasillos de un almacén: arriba, las categorías con su imagen como carteles de góndola, y debajo los productos alineados en filas de a uno, cada uno con su foto, su nombre, su precio y un control para sumarlo. Todo sobre blanco, con un solo color de acción, un verde oscuro. La interfaz no compite con los productos: son las fotos las que ponen el color.

La densidad es media y pensada para una mano en el celular. Todo lo que se toca mide al menos 44 px. Solo el buscador y las categorías quedan fijos arriba; la franja demo, el logo y las acciones del encabezado salen con el scroll para dejar lugar a la lista. Abajo vive una barra de pedido fija que aparece al sumar el primer producto y siempre muestra cuánto se lleva y cuánto cuesta. Es el único elemento flotante y es donde termina el pedido.

**Key Characteristics:**
- Fondo blanco, tarjetas de 8 px con borde gris claro y sombra mínima.
- Un único verde de acción, oscuro, para sumar, precio y envío.
- Controles de 44 px en fila: menos, cantidad, más, o un solo botón "Agregar".
- Barra de pedido inferior con total, cuenta en productos y unidades y botón de enviar.
- Sin globos de texto ni botones flotantes sueltos.
- Fuente Barlow en todo; la jerarquía sale del peso y el tamaño.

## Colors

Un verde de acción oscuro sobre blanco, grises de estructura y unos pocos colores de estado.

### Primary
- **Verde de acción** (#15803d): botón de más, botón de enviar pedido, precio, y acciones del encabezado como "Instalar", "Ayuda" e "Ingresar". Sobre blanco ronda 5 a 1 de contraste (cálculo propio), por encima de AA para texto normal. Con texto blanco encima, igual.
- **Verde de acción profundo** (#166534): texto del botón "Agregar" y del botón de menos, dentro de su borde verde de acción de 2 px.
- **Verde de selección** (#16a34a): borde de la tarjeta de un producto ya elegido.
- **Verde de selección suave** (#f0fdf4): fondo de esa tarjeta.

### Secondary
- **Rojo de agotado** (#ef4444): solo la etiqueta "Sin Stock".
- **Naranja de límite** (#f97316): aviso "Máx. disponible" cuando se alcanza el stock. Se conserva como está.
- **Ámbar de demo** (#fbbf24): franja "Tienda de demostración", con texto ámbar oscuro (#451a03).

### Neutral
- **Blanco de góndola** (#ffffff) y **tinta** (#111827): fondo y texto base.
- **Pizarra de pasillo** (#1f2937) con texto #f9fafb: categoría activa.
- **Gris de etiqueta** (#6b7280): cuenta de productos, texto secundario y pie.
- **Gris de regla** (#e5e7eb): bordes de tarjeta, línea bajo la zona fija y borde de la barra de pedido.
- **Lavado de pie** (#f9fafb): fondo del pie.

### Named Rules
**The One Action Green Rule.** Un solo verde, #15803d, para todo lo que se toca y para el precio. El verde de selección (#16a34a) se usa solo como borde, y su fondo suave (#f0fdf4) marca lo que ya está elegido: el producto que ya está en el pedido y la variedad elegida en la ventana del Producto Surtido. Ese fondo suave también es el fondo al pasar el cursor sobre los botones con borde verde, como "Agregar" y "Elegir sabores". Los demás colores solo informan estados.

## Typography

**Display Font:** Barlow (con system-ui como respaldo)
**Body Font:** Barlow
**Label Font:** Barlow

**Character:** un grotesco humanista, claro y algo condensado, que se lee bien en tamaños chicos sobre celular.

### Hierarchy
- **Store name** (700, 20px, 1.25): nombre de la Store en el encabezado.
- **Section** (700, 18px): categoría sobre el listado, con la cuenta "N productos" a la derecha en 14px y gris de etiqueta. Un solo título por sección.
- **Product name** (700, 14px): nombre del producto en la fila.
- **Price** (700, 16px, verde de acción): precio, siempre en el verde de acción.
- **Quantity** (700, 17px): cantidad entre los botones de menos y más.
- **Action** (600, 15px): acciones del encabezado y botón "Agregar".
- **Cart total** (700, 20px): total en pesos de la barra de pedido, con la cuenta debajo en 13px y gris de etiqueta.
- **Label** (500, 12px): nombres de categoría bajo cada imagen, avisos y etiquetas.

### Named Rules
**The Weight Hierarchy Rule.** La jerarquía se arma con peso y tamaño dentro de una sola familia.

## Layout

Una columna a todo el ancho con 8px de margen lateral. De arriba hacia abajo: franja demo si corresponde, encabezado con logo, nombre y tres acciones de texto, y la zona fija. Solo la zona fija, es decir el buscador y las categorías con imagen, se queda arriba al bajar; está separada de la lista con una línea de 1px y fondo blanco sólido. Las acciones del encabezado son "Instalar", "Ayuda" e "Ingresar", cada una de 44px de alto como mínimo.

La lista conserva sus dos modos, filas de a uno con 16px de separación o grilla de dos columnas con 8px, que se conmutan con el botón junto al buscador. Cada sección lleva un solo título. Al tocar una categoría, el título de su sección queda 12px debajo de la zona fija: el margen de desplazamiento es la altura real de esa zona, que la zona publica en una variable de CSS, más 12px; no es un número fijo. Sin subcategorías la fila de subcategorías no se dibuja y la zona fija mide unos 149px; con subcategorías suma unos 35px. Al final de la lista se reserva espacio suficiente para que la barra de pedido nunca tape el último producto ni el pie.

## Elevation & Depth

Casi plano. Las tarjetas son planas con borde y una sombra mínima que crece al pasar el cursor. El único elemento con sombra pronunciada es la barra de pedido, que proyecta hacia arriba. La zona fija superior se separa con una línea, no con translucidez ni desenfoque.

### Shadow Vocabulary
- **Tarjeta en reposo** (`shadow-sm`): tarjeta de producto.
- **Tarjeta elevada** (`shadow-md`): al pasar el cursor.
- **Barra de pedido** (`box-shadow: 0 -6px 18px rgb(0 0 0 / 0.13)`): proyecta hacia arriba sobre la lista.

### Named Rules
**The Light Card Rule.** Una tarjeta nunca lleva más que un borde gris y una sombra mínima. El peso visual lo ponen las fotos.
**The One Raised Bar Rule.** La barra de pedido es lo único que se eleva sobre la lista.

## Shapes

Esquinas de 8px en las tarjetas, 12px en los chips de categoría y en el botón de enviar pedido, 6px en etiquetas chicas, círculo completo en los botones de menos y más, y 22px en el botón "Agregar". La foto de la fila ocupa el lado izquierdo de la tarjeta (80 por 80 px), pegada al borde, y toma sus esquinas redondeadas.

## Components

### Product row (vista de lista)
- **Style:** tarjeta blanca de 8px con borde gris claro; foto de 80 por 80 px a la izquierda, nombre y precio al centro, controles a la derecha.
- **States:** con cantidad elegida, el borde pasa al verde de selección y el fondo al verde suave. Sin stock reemplaza los controles por la etiqueta roja y oculta el precio. Al llegar al límite aparece "Máx. disponible" en naranja.

### Product square card (vista de grilla)
- **Style:** como hoy, tarjeta vertical con foto de 128px arriba, nombre centrado y precio. Sus controles pasan a los mismos de 44px de la fila. Ver "Pendiente de prototipar".

### Quantity controls
- **Con cantidad cero:** un solo botón "+ Agregar" de 44px de alto, con borde de 2px en verde de acción, fondo blanco, texto en verde profundo y esquina de 22px.
- **Con cantidad:** en fila, `[ − 2 + ]`. El menos es un círculo de 44px con borde de 2px en verde de acción y fondo blanco. El más es un círculo de 44px relleno de verde de acción con signo blanco. La cantidad va en medio, en 17px, con un ancho mínimo de 30px.
- **Accesibilidad:** cada botón lleva su etiqueta con el nombre del producto, y la cantidad se anuncia al cambiar.

### Category chip
- **Style:** al menos 84px de ancho, imagen descriptiva en recuadro de 48px de alto con esquina de 12px y el nombre debajo. La categoría activa se invierte a pizarra con texto claro. El chip mide siempre más de 44px de alto. La imagen se conserva en cualquier mejora.

### Subcategory badge
- **Style:** píldora de borde fino con texto de 12px, para saltar entre subcategorías. Se conserva como hoy. Ver "Pendiente de prototipar".

### Search field
- **Style:** campo blanco de 44px de alto con borde gris y esquina de 8px, anillo verde de 1px al enfocar. Junto a él, el botón que conmuta lista y grilla, que se mantiene como está.

### Header actions
- **Style:** tres botones de texto sin fondo ni borde, en verde de acción, 15px y peso 600, de 44px de alto y 44px de ancho mínimo: "Instalar", "Ayuda" e "Ingresar". "Instalar" reemplaza al botón flotante azul y su globo.

### Order bar
- **Style:** barra fija abajo con fondo blanco, borde superior de 1px y sombra hacia arriba. A la izquierda el total en pesos (20px, 700) y debajo "N productos · M unidades" con plural correcto ("1 producto · 1 unidad"). A la derecha el botón "Enviar pedido" con el ícono de WhatsApp, verde de acción, texto blanco de 16px en peso 700, 48px de alto y esquina de 12px.
- **Cómo se cuenta (decidido por Andrés el 2026-11-03):** "productos" son los productos distintos del pedido. "Unidades" suma las unidades de los productos que se venden por unidad. **Un producto que se vende por peso cuenta siempre 1 unidad, sin importar cuántos gramos o kilos se lleven.** Ejemplos: 100 g y 500 g de jamón dan "1 producto · 1 unidad". Dos gaseosas iguales y 300 g de jamón dan "2 productos · 3 unidades". La barra nunca muestra la cantidad en gramos.
- **Behavior:** aparece al sumar el primer producto y desaparece cuando el pedido queda vacío. Al tocar enviar se abre el mensaje de WhatsApp como hoy.

### Demo banner
- **Style:** franja ámbar de ancho completo con texto de 12px en peso 600. Solo en la Demo Store. Sale con el scroll.

### Footer
- **Demo Store:** fondo #f9fafb, borde superior de 1px, texto de 13px en gris de etiqueta. Dice que es una tienda de demostración, muestra el crédito de Andrés Medina con su email y la invitación a contratar el sistema.
- **Tienda real:** pie mínimo con "Pedidos por WhatsApp · nombre de la tienda" y un enlace "¿Necesitás ayuda?". Sin nombre ni email del desarrollador. Los enlaces son verdes de acción, en peso 600 y de 44px de alto.

## Do's and Don'ts

### Do:
- **Do** usar el verde de acción (#15803d) solo para acciones y precio.
- **Do** dar 44px de alto como mínimo a todo lo que se toca.
- **Do** mantener las tarjetas planas, con borde gris y sombra mínima.
- **Do** dejar que las fotos de producto pongan el color.
- **Do** mostrar siempre total, productos y unidades en la barra de pedido.
- **Do** conservar la imagen descriptiva en cada categoría.
- **Do** escribir plurales correctos ("1 producto", "2 unidades").
- **Do** contar un producto por peso como 1 unidad en la barra de pedido, sin importar el peso.

### Don't:
- **Don't** usar globos de texto ni botones flotantes sueltos.
- **Don't** apilar los botones de más y menos en vertical.
- **Don't** sumar colores nuevos de estado sin elegirlos del conjunto existente.
- **Don't** meter nada más que buscador y categorías en la zona fija superior.
- **Don't** usar translucidez con desenfoque en las barras fijas.
- **Don't** mostrar datos ni publicidad del desarrollador en tiendas reales.

## Pendiente de prototipar

El prototipo A no modela estos elementos. Se documentan como funcionan hoy y hay que revisarlos en una próxima iteración.

- **Botón de lista y grilla:** se mantiene junto al buscador como está. Hoy mide 36px, por debajo del mínimo de 44px.
- **Vista de grilla:** controles y precio a adaptar al estándar de 44px.
- **Subcategorías:** encabezados y marcadores de salto. Hoy cada subcategoría repite el título de la categoría con su propio contador, y en el prototipo se quitó esa repetición.
- **Productos por kg o 100 g y su formato de cantidad.**
- **Producto surtido y su ventana de variedades, y etiquetas de combos.**
- **Estados de stock** ("Sin Stock", "Máx. disponible") en el nuevo control de cantidad.
- **Búsqueda con la página scrolleada:** `ProductList` agrega un margen superior de 192px (`fixHeight`) cuando se busca con la página más abajo de 50px. Se pensó para la zona fija anterior y no se revisó en #176. Con pocos resultados el primero puede quedar tapado por la zona fija. Hay que revisarlo, probablemente llevando la vista al inicio de los resultados al buscar.
- **Logo y avatar** del encabezado con imagen real de cada Store.

## Estado anterior

Lo que existía en el código el 2026-11-03, antes de adoptar el prototipo A. Sirve para no repetir errores y para saber qué falta cambiar.

**Resuelto en el prototipo A, falta implementarlo en el código:**
- Botones de sumar y quitar de 24px, apilados, con el quitar en rojo.
- Sin total ni cantidad visibles del pedido; solo un botón flotante de WhatsApp.
- Dos botones flotantes (WhatsApp e instalar) con globos de texto oscuros que se pisaban y tapaban filas de producto.
- Globo con "1 productos": plural incorrecto y sin mostrar unidades.
- Zona fija de casi una cuarta parte de la pantalla (cerca de 190px sobre 844px), con franja demo, encabezado, buscador y categorías.
- "Iniciar sesión" de 20px y "Ayuda" de 28px de alto.
- Tres verdes de la paleta de Tailwind 4 sin regla (green-500, green-600 y green-700), con el precio en green-600, cerca de 3,2 a 1 de contraste, bajo AA. Los hex de la paleta de Tailwind 3 (#22c55e, #16a34a y #15803d) que figuraban en una versión anterior de este documento no eran los que usa el código: el proyecto usa Tailwind 4, que trae otros valores. El verde de acción de este documento (#15803d) se fija como variable de color propia.
- Título de sección repetido: "Gaseosas (1 Categorias)" seguido de otro "Gaseosas".
- Barras fijas con translucidez y desenfoque.
- Pie con nombre, email y publicidad del desarrollador en todas las tiendas.

**Sigue abierto:**
- **Casi sin tokens propios.** Desde #172 hay variables de color para el verde de acción, su versión profunda, el verde de selección y su fondo suave en el CSS global. El resto sigue siendo clases de Tailwind por componente.
- **El documento HTML declara `lang="en"`** pero el contenido está en español.
- **Faltan tildes** en textos como "Categorias".
