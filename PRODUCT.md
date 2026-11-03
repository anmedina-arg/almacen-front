# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Comprador (usuario principal del catalogo publico).** Vecino del barrio de la Store que abre el link desde WhatsApp, en el celular, y arma un pedido chico de pocos productos, a menudo repetido. Perfil amplio y mixto: todas las edades, celulares de gama media o baja, uso con una mano, a veces conexion lenta. Confirmado por Andres el 2026-11-03.

**Store admin.** Dueno o encargado del comercio. Administra pedidos, stock, productos y clientes de su Store desde el panel `/{store}/admin`. Fuera del alcance del trabajo de diseno actual, que se centra en el catalogo del comprador.

**Platform admin.** Andres Medina, dueno de la plataforma (`super_admin`). Accede a todas las Stores desde `/admin`.

## Product Purpose

chaskyapp es una plataforma SaaS multi-tenant que le da a cada comercio (Store) un catalogo online y un panel de gestion. El comprador arma el carrito y el pedido llega al comercio como un mensaje de WhatsApp, que tambien queda registrado como orden en el sistema. El exito del catalogo es que el comprador arme y envie su pedido rapido y sin dudas.

## Positioning

Un solo deployment compartido por todas las Stores, con la Store resuelta por el primer segmento de la URL. Los modulos del panel se venden por suscripcion mediante feature flags independientes entre si. El pedido nace en WhatsApp, el canal que el comprador ya usa.

## Operating Context

- El comprador entra por un link de WhatsApp y termina enviando un mensaje de WhatsApp al comercio. No hay cobro dentro de la app.
- Stores en produccion: Market del Cevil (`market-del-cevil`), Yo Heladerias (`yo-heladerias`) y la Demo Store (`demo-store`), una Store de muestra de la plataforma con la franja "Tienda de demostracion".
- Cada Store aporta nombre, logo, numero de WhatsApp y feature flags. El resto de la UI es la misma para todas.
- La base TEST (Supabase) solo tiene datos de ejemplo para la Demo Store; el catalogo real vive en produccion.

## Capabilities and Constraints

- Catalogo publico renderizado en el servidor (Next.js 15, React 19, TanStack Query, Zustand para el carrito, Tailwind v4). Mobile first.
- **Sin pago online.** El pedido siempre termina en un mensaje de WhatsApp.
- **Una sola UI para todas las Stores.** Sin personalizacion por Store por ahora. Solo cambian nombre, logo y numero de WhatsApp.
- **Se instala como PWA.** La instalacion en el celular y el uso con conexion lenta son parte de la experiencia. El manifest es dinamico por Store.
- **Sin cuenta para comprar.** El comprador no necesita registrarse ni iniciar sesion para hacer un pedido.
- Productos con venta por unidad, kg o 100 gr, combos y Producto Surtido (el comprador elige Variedades).
- Con Control de stock activo, un producto Sin stock no muestra precio. Un pedido nunca se rechaza por falta de stock.
- Terminologia de dominio en CONTEXT.md (Store, Demo Store, Combo, Producto Surtido, Faltante, Sin stock, Mas vendidos).
- **Cada categoria lleva una imagen descriptiva** en el catalogo (el icono sobre el nombre). Es un elemento que se mantiene en cualquier rediseno. Confirmado por Andres el 2026-11-03.
- Sin decidir: si algun dia habra personalizacion visual por Store.

## Brand Commitments

El nombre del producto es chaskyapp (del quechua chaski, el mensajero por relevos). **Decidido por Andres el 2026-11-03: el catalogo del comprador y la landing de chaskyapp NO comparten identidad visual.** Son dos sistemas separados y no deben mezclarse: la landing esta documentada en `DESIGN.md` (raiz) y el catalogo publico en `docs/design/catalogo.md`. Para trabajo sobre el catalogo usar `docs/design/catalogo.md`, nunca `DESIGN.md`. Ese documento describe el destino elegido (prototipo A, 2026-11-03), no el estado actual del codigo.

## Evidence on Hand

- Catalogo en vivo de la Demo Store con 23 productos reales de ejemplo y fotos.
- Logos por Store en `stores.logo_url`; si falta, se usa un logo generico compartido.
- Sin testimonios, metricas de conversion ni datos de uso del catalogo en el repositorio. No inventarlos.

## Product Principles

1. El pedido en pocos toques gana sobre cualquier otra cosa en el catalogo.
2. El comprador siempre sabe que tiene en el carrito y cuanto suma antes de enviarlo por WhatsApp.
3. Una UI comun para todas las Stores: lo que se mejora, se mejora para todas.
4. Pensado primero para una mano, celular de gama media y conexion lenta.
5. Un faltante de stock informa, no bloquea.

## Accessibility & Inclusion

Apuntar a WCAG AA. Objetivos tactiles de al menos 44 px. Audiencia de todas las edades y dispositivos de gama media o baja, uso con una mano y conexion a veces lenta.
