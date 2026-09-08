import { z } from 'zod';

/**
 * Schemas de Orders (#119 núcleo + #120 items/payments/client + #121 POS).
 * features/admin/schemas/orderSchemas.ts ya no existe — llegó a definir
 * createOrderItemSchema acá E importarla desde admin (para
 * posOrderItemSchema) mientras acá se importaba algo de vuelta desde admin,
 * un import circular real (TDZ en runtime: "Cannot access
 * 'addOrderItemSchema' before initialization", encontrado en un smoke test
 * manual durante #120) — resuelto consolidando todo en un solo archivo.
 */

/**
 * Una Variedad elegida para una línea de Producto Surtido (#95) — el nombre
 * viaja acá porque es lo que se congela como snapshot al persistir.
 */
export const orderItemVariedadSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

/**
 * Schema for a single order item when creating an order.
 */
export const createOrderItemSchema = z.object({
  product_id: z.number().int().positive('ID de producto invalido'),
  product_name: z.string().min(1, 'Nombre de producto requerido').max(500),
  quantity: z
    .number({ invalid_type_error: 'La cantidad debe ser un numero' })
    .positive('La cantidad debe ser mayor a 0'),
  unit_price: z
    .number({ invalid_type_error: 'El precio debe ser un numero' })
    .min(0, 'El precio no puede ser negativo'),
  is_by_weight: z.boolean().default(false),
  from_suggestion: z.boolean().default(false),
  variedades: z.array(orderItemVariedadSchema).optional(),
});

/**
 * Schema for creating a new order (public endpoint).
 */
export const createOrderSchema = z.object({
  notes: z.string().max(1000, 'Maximo 1000 caracteres').optional(),
  whatsapp_message: z.string().min(1, 'Mensaje de WhatsApp requerido').max(5000),
  items: z
    .array(createOrderItemSchema)
    .min(1, 'Debe incluir al menos un item'),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;

/**
 * Schema for updating an order (admin: change status, notes).
 */
export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  notes: z.string().max(1000).nullable().optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
});

export type UpdateOrderSchemaInput = z.infer<typeof updateOrderSchema>;

/**
 * confirm/cancel no reciben ningún campo de negocio — el pedido a
 * confirmar/cancelar viene del path param, no del body. `.strict()` igual
 * suma valor real (#106, #119): antes ninguna de las dos rutas parseaba el
 * body con zod, así que un body con campos inesperados se aceptaba
 * silenciosamente sin efecto. Ahora se rechaza con 400 — cambio de
 * comportamiento intencional, documentado en el ticket.
 */
export const confirmOrderSchema = z.object({}).strict();
export const cancelOrderSchema = z.object({}).strict();

/**
 * Schema for adding an item to an existing order (admin).
 */
export const addOrderItemSchema = z.object({
  product_id: z.number().int().positive('ID de producto invalido'),
  product_name: z.string().min(1, 'Nombre de producto requerido').max(500),
  quantity: z
    .number({ invalid_type_error: 'La cantidad debe ser un numero' })
    .positive('La cantidad debe ser mayor a 0'),
  unit_price: z
    .number({ invalid_type_error: 'El precio debe ser un numero' })
    .min(0, 'El precio no puede ser negativo'),
  is_by_weight: z.boolean().default(false),
});

export type AddOrderItemSchemaInput = z.infer<typeof addOrderItemSchema>;

/**
 * Schema for updating an order item quantity/price (admin).
 */
export const updateOrderItemSchema = z.object({
  quantity: z
    .number({ invalid_type_error: 'La cantidad debe ser un numero' })
    .positive('La cantidad debe ser mayor a 0')
    .optional(),
  unit_price: z
    .number({ invalid_type_error: 'El precio debe ser un numero' })
    .min(0, 'El precio no puede ser negativo')
    .optional(),
});

export type UpdateOrderItemSchemaInput = z.infer<typeof updateOrderItemSchema>;

/**
 * POS (#121): mismo dominio de negocio que el checkout de WhatsApp, otro
 * punto de entrada (ADR-0013) — no un schema propio de un dominio aparte.
 * unit_cost queda en el schema porque el frontend (POSView.tsx) lo sigue
 * mandando, pero el service ya no lo usa: recalcula unit_cost server-side
 * con el mismo criterio que el resto de Orders (createOrder en
 * orderService.ts), matemáticamente equivalente acá porque POS manda
 * unit_price = product.price sin escalar (a diferencia del carrito público,
 * que normaliza a precio-por-unidad-base).
 */
export const posOrderItemSchema = addOrderItemSchema.extend({
  unit_cost: z.number().min(0).default(0),
});

export type PosOrderItemInput = z.infer<typeof posOrderItemSchema>;

export const posOrderSchema = z.object({
  customer_name: z.string().max(200).optional(),
  items: z.array(posOrderItemSchema).min(1, 'Debe incluir al menos un producto'),
});

export type PosOrderInput = z.infer<typeof posOrderSchema>;
