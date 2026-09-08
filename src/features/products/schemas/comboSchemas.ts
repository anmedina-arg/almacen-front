import { z } from 'zod';

export const updateComboComponentsSchema = z.object({
  components: z.array(
    z.object({
      component_product_id: z.number().int().positive(),
      quantity: z.number().positive('La cantidad debe ser mayor a 0'),
    })
  ),
});

export type UpdateComboComponentsInput = z.infer<typeof updateComboComponentsSchema>;
