import { z } from 'zod';
import { productCreateSchema } from './productCreateSchema';

export const productUpdateSchema = productCreateSchema.partial();

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
