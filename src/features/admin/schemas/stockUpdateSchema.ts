import { z } from 'zod';

/**
 * Schema for validating stock update form inputs.
 * Enforces business rules:
 * - Quantity must be >= 0 (no negative stock in manual control)
 * - Min stock must be >= 0 if provided
 * - Movement type must be one of the valid types
 * - Notes are optional but have a max length
 */
export const stockUpdateSchema = z.object({
  productId: z.number().int().positive('ID de producto invalido'),
  quantity: z
    .number({ invalid_type_error: 'La cantidad debe ser un numero' })
    .min(0, 'La cantidad no puede ser negativa')
    .max(999999999.999, 'Cantidad demasiado grande'),
  minStock: z
    .number({ invalid_type_error: 'El stock minimo debe ser un numero' })
    .min(0, 'El stock minimo no puede ser negativo')
    .max(999999999.999, 'Valor demasiado grande')
    .nullable()
    .default(null),
  movementType: z.enum(
    [
      'manual_adjustment',
      'initial_count',
      'correction',
      'loss',
      'sale',
      'purchase',
      'return',
    ],
    {
      errorMap: () => ({ message: 'Tipo de movimiento invalido' }),
    }
  ),
  notes: z
    .string()
    .max(500, 'Maximo 500 caracteres')
    .default(''),
});

export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;
