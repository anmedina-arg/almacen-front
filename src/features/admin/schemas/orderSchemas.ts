import { z } from 'zod';
import { addOrderItemSchema } from '@/features/orders/schemas/orderSchemas';

/**
 * Todo lo que vivía acá (createOrderSchema/updateOrderSchema en #119,
 * addOrderItemSchema/updateOrderItemSchema/orderItemVariedadSchema/
 * createOrderItemSchema en #120) se movió a
 * features/orders/schemas/orderSchemas.ts. Lo único que queda es POS
 * (#121, todavía sin migrar) — importa addOrderItemSchema de ahí porque
 * posOrderItemSchema la extiende. Dependencia en un solo sentido
 * (admin -> orders): tenerla en los dos sentidos causó un import circular
 * real (TDZ en runtime), ver el comentario en el archivo de orders.
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
