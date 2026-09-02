import { z } from 'zod';

/**
 * Deliberadamente NO comparte definición con
 * features/admin/schemas/productCreateSchema.ts (el schema client-side que
 * ProductFormModal/ComboFormModal usan para dar feedback inline antes de
 * pegarle al servidor) — a diferencia de categorySchemas.ts (#115), que sí
 * es una sola definición reusada. Los dos tienen requisitos genuinamente
 * distintos (ej. `image` ahí es una URL ya subida y requerida antes de
 * submit; acá solo hace falta lo que la base exige), así que unificarlos es
 * un cambio de diseño aparte, no scope de este ticket — mantenerlos
 * sincronizados a mano es el costo de esa decisión mientras tanto.
 */
const MAIN_CATEGORIES = [
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
] as const;

const SALE_TYPES = ['unit', '100gr', 'kg'] as const;

/**
 * mainCategory se normaliza a minúsculas antes de validar contra el enum —
 * los handlers viejos hacían `body.mainCategory.toLowerCase()` antes de
 * guardar (constraint de la base es case-sensitive); se replica acá vía
 * preprocess para no perder callers que mandan casing distinto (ej. "Almacen").
 */
const mainCategorySchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.enum(MAIN_CATEGORIES, { errorMap: () => ({ message: 'Categoría inválida' }) })
);

/**
 * Schema de creación — todo el objeto siempre está presente, así que las
 * reglas cruzadas (Producto Surtido) se pueden validar en su forma
 * completa, espejo de products_surtido_fields_check /
 * products_variedades_range_check (supabase/schema/products/products.sql).
 *
 * category_id requerido (#66): un producto sin categoría queda invisible
 * en el catálogo público sin ningún aviso — antes era opcional acá.
 */
export const createProductSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(100),
    price: z.number().positive('El precio debe ser positivo'),
    cost: z.number().min(0, 'El costo no puede ser negativo').optional().default(0),
    image: z.string().nullable().optional().transform((v) => v || ''),
    mainCategory: mainCategorySchema.optional(),
    categories: z.string().optional().default(''),
    active: z.boolean().optional().default(true),
    sale_type: z.enum(SALE_TYPES, { errorMap: () => ({ message: 'Tipo de venta inválido' }) }).optional().default('unit'),
    is_combo: z.boolean().optional().default(false),
    max_stock: z.number().min(0).nullable().optional(),
    category_id: z.number().int().positive('Categoría requerida'),
    subcategory_id: z.number().int().positive().nullable().optional(),
    is_producto_surtido: z.boolean().optional().default(false),
    familia_id: z.number().int().positive().nullable().optional(),
    min_variedades: z.number().int().min(1, 'Mínimo 1').nullable().optional(),
    max_variedades: z.number().int().min(1, 'Mínimo 1').nullable().optional(),
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

/**
 * Schema de edición — parcial a propósito (PUT solo manda los campos que
 * cambiaron). category_id se queda opcional/nullable acá (a diferencia de
 * create): no forzar a resolver la categoría de un producto legacy sin
 * categoría como efecto secundario de una edición no relacionada (#66 solo
 * pide requerirla al crear). Las reglas cruzadas de Producto Surtido NO se
 * replican acá — con un payload parcial no hay forma de evaluarlas sin
 * traer la fila actual primero; el CHECK de la base (products_surtido_fields_check)
 * sigue siendo el backstop real, mapeado a un mensaje legible en el service.
 */
export const updateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  price: z.number().positive('El precio debe ser positivo').optional(),
  cost: z.number().min(0, 'El costo no puede ser negativo').optional(),
  image: z.string().nullable().optional().transform((v) => v ?? undefined),
  mainCategory: mainCategorySchema.optional(),
  categories: z.string().optional(),
  active: z.boolean().optional(),
  sale_type: z.enum(SALE_TYPES, { errorMap: () => ({ message: 'Tipo de venta inválido' }) }).optional(),
  is_combo: z.boolean().optional(),
  max_stock: z.number().min(0).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  subcategory_id: z.number().int().positive().nullable().optional(),
  is_producto_surtido: z.boolean().optional(),
  familia_id: z.number().int().positive().nullable().optional(),
  min_variedades: z.number().int().min(1, 'Mínimo 1').nullable().optional(),
  max_variedades: z.number().int().min(1, 'Mínimo 1').nullable().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
