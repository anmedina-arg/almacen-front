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
  }),
  categories: z.string().optional().default(''),
  active: z.boolean().default(true),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
