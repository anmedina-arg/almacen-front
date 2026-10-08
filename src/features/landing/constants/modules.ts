export type ChapaTone = 'bone' | 'red' | 'mustard' | 'navy';

export interface LandingModule {
  code: string;
  name: string;
  summary: string;
  bullets: string[];
  tone: ChapaTone;
  /** Columnas (de 12) que ocupa en la pared, en pantallas anchas. */
  span: number;
  /** Captura real del modulo, servida desde /public (ej. "/landing/stock.png"). */
  image?: string;
}

export const LANDING_MODULES: LandingModule[] = [
  {
    code: '101',
    name: 'Precios y costos',
    summary: 'Cada producto con su precio de venta y su costo.',
    bullets: [
      'Precio y costo por producto, en un solo lugar.',
      'Sabés cuánto ganás en cada pedido.',
      'Si corregís un costo, se actualiza en los pedidos pendientes.',
    ],
    tone: 'mustard',
    span: 5,
  },
  {
    code: '102',
    name: 'Stock',
    summary: 'Sabé qué hay en el local antes de prometerlo.',
    bullets: [
      'Ajustes manuales con historial completo de movimientos.',
      'El catálogo bloquea el botón cuando no hay stock.',
      'Combos con stock calculado desde sus componentes.',
    ],
    tone: 'navy',
    span: 7,
  },
  {
    code: '103',
    name: 'Estado de pedidos',
    summary: 'Pendiente, confirmado o cancelado, sin perder ninguno.',
    bullets: [
      'Filtrá por fecha, estado, cliente, pago o producto.',
      'Confirmás desde el panel, con el detalle a mano.',
    ],
    tone: 'bone',
    span: 4,
  },
  {
    code: '104',
    name: 'Clientes y cuentas',
    summary: 'Quién compró, cómo pagó y cuánto debe.',
    bullets: [
      'Cada pedido asignado a un cliente, por barrio y lote.',
      'Efectivo, transferencia y pagos parciales.',
      'Saldo "debe" o "a favor" de un vistazo.',
    ],
    tone: 'red',
    span: 4,
  },
  {
    code: '105',
    name: 'Vendé más por pedido',
    summary: 'Lo que un vecino lleva, sugiere lo que lleva el otro.',
    bullets: [
      'Sugiere productos que suelen comprarse juntos.',
      'Aprende de tus pedidos anteriores.',
      'Se recalcula cuando vos querés.',
    ],
    tone: 'mustard',
    span: 4,
  },
  {
    code: '106',
    name: 'Qué no te puede faltar',
    summary: 'Qué se vende rápido y qué se queda en la góndola.',
    bullets: [
      'Ranking de productos por unidades o por facturación.',
      'Qué no te puede faltar.',
      'En qué productos estás perdiendo plata.',
      'En el catálogo, los más vendidos de cada subcategoría van primero.',
    ],
    tone: 'bone',
    span: 3,
  },
  {
    code: '107',
    name: 'Categorías',
    summary: 'Un catálogo ordenado como lo ordenás en el local.',
    bullets: [
      'Categorías y subcategorías propias.',
      'Navegación y búsqueda para el cliente desde el celular.',
    ],
    tone: 'navy',
    span: 4,
  },
  {
    code: '108',
    name: 'Dashboard e informes',
    summary: 'Las ventas del período, sin armar planillas.',
    bullets: [
      'Facturación, costo y margen del período.',
      'Ranking de productos y de categorías.',
      'Informes en CSV de ventas y de productos.',
    ],
    tone: 'red',
    span: 5,
  },
];

export const RELAY_STATIONS = [
  {
    name: 'El vecino',
    text: 'Arma su pedido en el catálogo, desde el celular.',
  },
  {
    name: 'WhatsApp',
    text: 'Te llega el mensaje ya ordenado, con todo el detalle.',
  },
  {
    name: 'El almacén',
    text: 'Confirmás, ajustás el stock y anotás el pago.',
  },
  {
    name: 'La cuenta',
    text: 'Saldos, margen y ranking al día, sin cuaderno.',
  },
];
