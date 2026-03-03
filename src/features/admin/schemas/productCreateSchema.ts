import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  price: z.number().positive('El precio debe ser positivo').min(0.01, 'Precio mínimo: $0.01'),
  image: z.string().url('URL inválida').min(1, 'Imagen requerida'),
  mainCategory: z.enum([
    'panaderia',
    'congelados',
    'combos',
    'snaks',
    'otros',
    'bebidas',
    'lacteos',
    'almacen',
    'fiambres',
    'pizzas',
  ], {
    errorMap: () => ({ message: 'Categoría inválida' }),
  }).optional().default('otros'),
  categories: z.string().optional().default(''),
  active: z.boolean().default(true),
  sale_type: z.enum(['unit', '100gr', 'kg'], {
    errorMap: () => ({ message: 'Tipo de venta inválido' }),
  }).default('unit'),
  cost: z.number().min(0, 'El costo no puede ser negativo').optional().default(0),
  is_combo: z.boolean().optional().default(false),
  max_stock: z.number().min(0).nullable().optional().default(null),
  category_id: z.number().int().positive().nullable().optional(),
  subcategory_id: z.number().int().positive().nullable().optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
