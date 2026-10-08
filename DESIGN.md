---
name: chaskyapp
description: Pared de chapas esmaltadas para vender un sistema de almacén de barrio. Cobalto, hueso, rojo señal y mostaza; lettering condensado pesado.
colors:
  wall-cobalt: "#1f4e9e"
  enamel-bone: "#f3eedd"
  signal-red: "#c8321f"
  sign-mustard: "#f2b705"
  night-navy: "#0e2247"
  bare-steel: "#3a3f47"
  ticket-paper: "#fbf8ee"
typography:
  display:
    fontFamily: "Archivo, Barlow, sans-serif"
    fontSize: "clamp(2.6rem, 9.6vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 66"
  headline:
    fontFamily: "Archivo, Barlow, sans-serif"
    fontSize: "clamp(2.2rem, 5.4vw, 4.4rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 66"
  title:
    fontFamily: "Archivo, Barlow, sans-serif"
    fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)"
    fontWeight: 900
    lineHeight: 0.92
    fontVariation: "'wdth' 66"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Barlow, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 800
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 80"
rounded:
  code: "8px"
  button: "12px"
  stripe: "14px"
  plate: "22px"
spacing:
  sm: "10px"
  md: "16px"
  lg: "28px"
  xl: "40px"
components:
  chapa-bone:
    backgroundColor: "{colors.enamel-bone}"
    textColor: "{colors.night-navy}"
    rounded: "{rounded.plate}"
    padding: "42px"
  chapa-red:
    backgroundColor: "{colors.signal-red}"
    textColor: "#ffffff"
    rounded: "{rounded.plate}"
    padding: "42px"
  chapa-mustard:
    backgroundColor: "{colors.sign-mustard}"
    textColor: "{colors.night-navy}"
    rounded: "{rounded.plate}"
    padding: "42px"
  chapa-navy:
    backgroundColor: "{colors.night-navy}"
    textColor: "{colors.enamel-bone}"
    rounded: "{rounded.plate}"
    padding: "42px"
  button-red:
    backgroundColor: "{colors.signal-red}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 20px"
    height: "48px"
  button-mustard:
    backgroundColor: "{colors.sign-mustard}"
    textColor: "{colors.night-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 20px"
    height: "48px"
  ticket:
    backgroundColor: "{colors.ticket-paper}"
    textColor: "{colors.night-navy}"
    padding: "22px 24px 38px"
---

# Design System: chaskyapp

## Overview

**Creative North Star: "La pared de chapas"**

chaskyapp se ve como el frente de un almacén de barrio: una pared pintada de azul cobalto de la que cuelgan chapas esmaltadas. Cada módulo del producto es una chapa; el plan base es la grande. El sistema es plano, tangible y legible desde la vereda: relleno sólido, un filete interior, remaches en las esquinas y una sombra con relieve que despega la chapa de la pared.

La identidad nace del nombre: chasky (chasqui) es el mensajero que corre por relevos. La pared es la ruta, cada chapa una estación, el pedido el mensaje que no se pierde. Esa referencia aparece como narrativa y como el quipu (cuerda con nudos) usado de divisor, nunca como estética de souvenir.

**Key Characteristics:**
- Pared cobalto drenched; las chapas son los únicos objetos de color.
- Lettering condensado pesado en mayúsculas, a gran escala.
- Rellenos planos, sin degradados de decoración ni vidrio.
- Remaches y descascarados pequeños como único detalle de material.
- Un solo momento de movimiento: las chapas se cuelgan al cargar y se dan vuelta al tocarlas.

## Colors

Cuatro esmaltes saturados sobre una pared azul; el hueso y el azul noche sostienen la lectura.

### Primary
- **Pared cobalto** (#1f4e9e): el fondo de toda la página. Es el campo que da contraste a las chapas.
- **Rojo señal** (#c8321f): chapas de énfasis y botón principal sobre hueso. Texto sobre rojo siempre en blanco.

### Secondary
- **Mostaza de cartel** (#f2b705): chapas de módulo, botón sobre rojo o azul y acento de nudos del quipu. Texto sobre mostaza en azul noche.

### Neutral
- **Hueso esmaltado** (#f3eedd): chapa principal y texto sobre la pared. Texto sobre hueso en azul noche.
- **Azul noche** (#0e2247): tinta sobre hueso y mostaza, borde de botones y chapas oscuras.
- **Acero al descubierto** (#3a3f47): descascarados en las esquinas de las chapas.
- **Papel de ticket** (#fbf8ee): el ticket de pedido de ejemplo, el único objeto que no es chapa.

### Named Rules
**The Enamel Only Rule.** El color vive en chapas y botones, nunca como degradado ni como texto de color sobre fondo de color sin contraste de 4.5:1.

## Typography

**Display Font:** Archivo (variable, eje de ancho en 66), con Barlow como respaldo
**Body Font:** Barlow, con system-ui como respaldo

**Character:** un grotesco condensado en peso 900, como lettering de cartel; contrasta con un texto de cuerpo cálido y legible.

### Hierarchy
- **Display** (900, clamp(2.6rem, 9.6vw, 6rem), 0.92): el titular del hero, directo sobre la pared.
- **Headline** (900, clamp(2.2rem, 5.4vw, 4.4rem), 0.92): títulos de sección, siempre en mayúsculas.
- **Title** (900, clamp(1.9rem, 3.4vw, 2.7rem), 0.92): nombre de cada módulo en su chapa.
- **Body** (500, 17px, 1.5): párrafos, máximo 52 a 56 caracteres por línea.
- **Label** (800, ancho 80, 1.05rem, tracking 0.02em, mayúsculas): botones.

### Named Rules
**The Sign Lettering Rule.** Todo texto de display va en mayúsculas, peso 900 y ancho condensado; nunca se usa una cara de sistema como voz de display.

## Layout

Contenedor de hasta 1240px con 16px de margen mínimo. La pared usa una grilla de 12 columnas en pantallas anchas (desde 900px) con módulos de 3 a 8 columnas, y se apila en una sola columna en celular. El hero combina titular a todo el ancho y una fila de 7/5 con la chapa del plan base y el ticket. Los huecos entre chapas escalan con clamp(16px, 2vw, 28px); más espacio sobre un título que debajo.

## Elevation & Depth

Las chapas son objetos con relieve: se separan de la pared con una sombra de offset y desenfoque, no con un halo. El botón se asienta sobre un borde inferior de 5px que desaparece al presionarlo.

### Shadow Vocabulary
- **Chapa** (`box-shadow: 0 20px 30px -14px rgb(5 16 40 / 0.65), 0 2px 0 rgb(0 0 0 / 0.12)`): toda chapa.
- **Botón** (`box-shadow: 0 5px 0 -1px #0e2247, 0 12px 14px -8px rgb(5 16 40 / 0.6)`): botones en reposo; al presionar baja a 1px.
- **Ticket** (`filter: drop-shadow(0 14px 14px rgb(5 16 40 / 0.55))`): sobre un contenedor aparte, porque el borde dentado usa máscara.

### Named Rules
**The Hung Plate Rule.** La sombra siempre tiene desplazamiento vertical y desenfoque; nunca un bloque duro desplazado ni un halo sin offset.

## Shapes

Esquinas generosas de 22px en la chapa, con un filete interior de 2px a 10px del borde (radio 14px) en el color de acento de cada chapa. Cuatro remaches circulares de 7px a 21px de cada esquina y dos descascarados irregulares de 6 a 13px sobre acero. El ticket tiene borde inferior dentado.

## Components

### Buttons
- **Shape:** rectángulo de esquina 12px con borde de 2px en azul noche.
- **Primary:** rojo con texto blanco sobre chapas claras; mostaza con texto azul noche sobre rojo o pared.
- **Hover / Focus:** sube 2px y alarga el borde inferior; focus con anillo mostaza de 3px a 3px de distancia.

### Chapa
- **Style:** relleno plano en hueso, rojo, mostaza o azul noche; filete interior, remaches y descascarados.
- **Behavior:** las chapas de módulo giran 180° sobre su eje vertical al tocarlas y muestran el reverso en azul noche con la lista de lo que hace el módulo y un botón "Volver".

### Navigation
- **Style:** el logotipo es dos chapas contiguas ("chasky" en mostaza, "app" en rojo); el link "Stores" va subrayado con 2px; en celular el botón de WhatsApp se compacta.

### Quipu
- Cuerda principal con cordones colgantes y nudos en hueso y mostaza, usada como divisor de sección; nunca como ilustración principal.

## Do's and Don'ts

### Do:
- **Do** sostener el contraste de 4.5:1 en texto de cuerpo y 3:1 en texto grande sobre cada esmalte.
- **Do** usar un solo momento de movimiento: el colgado de chapas al cargar y el giro al tocarlas.
- **Do** etiquetar como ejemplo cualquier dato de demostración.
- **Do** respetar `prefers-reduced-motion`: sin animación de entrada ni giro animado.

### Don't:
- **Don't** usar plumas, máscaras ni estética "inca" de souvenir; el chasqui aparece como relevo y quipu, con sobriedad.
- **Don't** usar degradados decorativos, vidrio ni texto degradado.
- **Don't** repetir tarjetas iguales de ícono, título y texto como estructura de página.
- **Don't** inventar precios, clientes ni métricas en la landing.
