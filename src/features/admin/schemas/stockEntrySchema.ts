import { z } from 'zod';

export const stockEntryItemSchema = z.object({
  product_id: z.number().int().positive(),
  increment: z.number().positive('Debe ser mayor a 0'),
  notes: z.string().max(500).default(''),
});

export const stockEntryBatchSchema = z
  .array(stockEntryItemSchema)
  .min(1, 'No hay productos para ingresar');

export type StockEntryItemInput = z.infer<typeof stockEntryItemSchema>;
