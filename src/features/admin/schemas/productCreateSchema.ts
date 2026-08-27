import { z } from 'zod';

export const productCreateSchema = z
  .object({
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
    // Producto Surtido (#92/#93). is_producto_surtido=false ⟹ los otros
    // tres tienen que venir en null — mismo criterio que
    // products_surtido_fields_check en la base, replicado acá para dar el
    // error en el formulario en vez de esperar el 500/CHECK violation del
    // servidor.
    is_producto_surtido: z.boolean().optional().default(false),
    familia_id: z.number().int().positive().nullable().optional().default(null),
    min_variedades: z.number().int().min(1, 'Mínimo 1').nullable().optional().default(null),
    max_variedades: z.number().int().min(1, 'Mínimo 1').nullable().optional().default(null),
  })
  .refine(
    (data) =>
      !data.is_producto_surtido ||
      (data.familia_id != null && data.min_variedades != null && data.max_variedades != null),
    {
      message: 'Un Producto Surtido necesita Familia, mínimo y máximo de Variedades',
      path: ['familia_id'],
    }
  )
  .refine(
    (data) =>
      data.is_producto_surtido ||
      (data.familia_id == null && data.min_variedades == null && data.max_variedades == null),
    {
      // Espejo de products_surtido_fields_check: si no es Producto Surtido,
      // no puede quedar familia_id/min/max de una elección anterior — evita
      // que un toggle desactivado sin limpiar el resto del form termine en
      // un CHECK violation crudo del servidor en vez de un error claro acá.
      message: 'Sin "Es Producto Surtido" no puede haber Familia ni mínimo/máximo cargados',
      path: ['is_producto_surtido'],
    }
  )
  .refine(
    (data) =>
      data.min_variedades == null ||
      data.max_variedades == null ||
      data.max_variedades >= data.min_variedades,
    {
      message: 'El máximo tiene que ser mayor o igual al mínimo',
      path: ['max_variedades'],
    }
  );

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
