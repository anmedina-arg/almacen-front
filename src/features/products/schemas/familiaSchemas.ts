import { z } from 'zod';

export const familiaSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

export const variedadSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  familia_id: z.number().int().positive(),
});

// PUT /api/variedades/[id]: rename y/o toggle de active son independientes
// — al menos uno de los dos tiene que venir, si no no hay nada que actualizar.
export const updateVariedadSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.active !== undefined, {
    message: 'Nada para actualizar',
  });

export type FamiliaInput = z.infer<typeof familiaSchema>;
export type VariedadInput = z.infer<typeof variedadSchema>;
export type UpdateVariedadInput = z.infer<typeof updateVariedadSchema>;
