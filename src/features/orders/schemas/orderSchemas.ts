import { z } from 'zod';

/**
 * Schemas de Orders (#119 núcleo + #120 items/payments/client). POS (#121)
 * sigue en features/admin/schemas/orderSchemas.ts, que importa
 * addOrderItemSchema de acá (posOrderItemSchema la extiende) — dependencia
 * en un solo sentido (admin -> orders), a propósito: definir
 * createOrderItemSchema acá E importarla desde admin, mientras admin a su
 * vez exportaba algo que acá se necesitaba, generaba un import circular
 * real entre los dos archivos (TDZ en runtime: "Cannot access
 * 'addOrderItemSchema' before initialization", encontrado en smoke test
 * manual). Cuando #121 migre POS, esto se termina de consolidar acá.
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
