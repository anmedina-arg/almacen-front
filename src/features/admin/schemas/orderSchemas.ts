import { z } from 'zod';

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
});

export type UpdateOrderSchemaInput = z.infer<typeof updateOrderSchema>;

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
