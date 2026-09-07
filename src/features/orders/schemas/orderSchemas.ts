import { z } from 'zod';
import { createOrderItemSchema } from '@/features/admin/schemas/orderSchemas';

/**
 * Schemas del núcleo de Orders (#119) — createOrderItemSchema sigue viviendo
 * en features/admin/schemas/orderSchemas.ts porque también la usa
 * posOrderItemSchema (POS, #121, todavía sin migrar) y addOrderItemSchema
 * (items de un pedido existente, #120, todavía sin migrar). Cuando esos dos
 * tickets terminen de migrar, esto se consolida acá.
 */

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
