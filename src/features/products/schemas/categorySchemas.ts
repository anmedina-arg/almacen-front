import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  image_url: z.string().url().nullable().optional(),
});

export const subcategoryNameSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type SubcategoryNameInput = z.infer<typeof subcategoryNameSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
