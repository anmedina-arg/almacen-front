# Producto Surtido se agrega al carrito en dos pasos, no con el tap directo de +/-

Todo producto del catálogo se agrega al carrito con un tap en "+" (`cartStore.addToCart`),
sumando cantidad de forma directa e inmediata. Un Producto Surtido no puede seguir ese
mismo patrón: cada unidad necesita una selección de Variedades (entre un mínimo y un máximo
configurables por producto) antes de poder considerarse una línea real de pedido — no hay
forma de capturar esa elección, con su validación, en un solo tap.

Se decidió separar el gesto en dos pasos: el "+/-" de la card de un Producto Surtido pasa a
ser un contador de unidades *pendientes de configurar* (estado local, no entra todavía al
carrito), y el modal "Elegir sabores" es el único punto donde esas unidades se confirman
como líneas reales — cada unidad confirmada queda como su propia línea, nunca se fusiona
con otra aunque la combinación de Variedades sea idéntica. Alguien viendo el resto de las
cards del catálogo (donde "+" sí agrega directo) podría asumir que este producto es
inconsistente o está roto si no conoce esta razón.

**Consecuencia**: el envío del pedido por WhatsApp queda bloqueado si existen unidades
stageadas sin confirmar Variedades — el sistema tiene que validarlo explícitamente antes de
habilitar el botón de envío, con aviso de qué producto quedó incompleto.
