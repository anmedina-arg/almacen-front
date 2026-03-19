import { z } from 'zod';

const MANZANA_LOTE_REGEX = /^[A-Z](0[1-9]|[12][0-9]|30)$/;

export const assignClientSchema = z.discriminatedUnion('barrio', [
  z.object({
    barrio: z.enum(['AC1', 'AC2']),
    manzana_lote: z
      .string()
      .regex(MANZANA_LOTE_REGEX, 'Formato inválido. Ejemplo: H10, A01, Z30'),
  }),
  z.object({
    barrio: z.literal('otros'),
    manzana_lote: z.string().trim().min(1, 'Ingresá una descripción').optional(),
  }),
]);

export type AssignClientSchema = z.infer<typeof assignClientSchema>;
