import { z } from 'zod';

export const comboComponentSchema = z.object({
  component_product_id: z.number().int().positive(),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
});

/**
 * #167: un combo sin componentes es un error de carga — con Disponible 0
 * cada pedido lo registra con Faltante igual a la cantidad pedida. Se
 * corrige donde se carga (alta y edición), no con casos especiales en la
 * regla de Disponible/Faltante. La comparten el alta de un combo
 * (createProductSchema) y la edición de su composición.
 */
export const COMBO_NEEDS_COMPONENTS = 'El combo necesita al menos un componente';

export const comboComponentsListSchema = z.array(comboComponentSchema).min(1, COMBO_NEEDS_COMPONENTS);

export const updateComboComponentsSchema = z.object({
  components: comboComponentsListSchema,
});

export type ComboComponentInput = z.infer<typeof comboComponentSchema>;
export type UpdateComboComponentsInput = z.infer<typeof updateComboComponentsSchema>;
