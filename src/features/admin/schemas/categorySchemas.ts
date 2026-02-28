import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  image_url: z.string().url().nullable().optional(),
});

export const subcategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  category_id: z.number().int().positive(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type SubcategoryInput = z.infer<typeof subcategorySchema>;
