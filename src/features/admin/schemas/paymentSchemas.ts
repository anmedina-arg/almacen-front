import { z } from 'zod';

const paymentMethodSchema = z.enum(['efectivo', 'transferencia']);

export const setPaymentsSchema = z
  .object({
    payments: z
      .array(
        z.object({
          method: paymentMethodSchema,
          amount: z.number().positive('El monto debe ser mayor a 0').optional(),
        })
      )
      .min(1, 'Debe haber al menos un método de pago')
      .max(2, 'Máximo 2 métodos de pago'),
    order_total: z.number().positive(),
  })
  .superRefine(({ payments, order_total }, ctx) => {
    // Duplicate method check
    const methods = payments.map((p) => p.method);
    if (new Set(methods).size !== methods.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No se puede repetir el mismo método de pago',
      });
    }

    // When 2 methods: both amounts are required and must sum to order total
    if (payments.length === 2) {
      const missingAmount = payments.some((p) => p.amount === undefined);
      if (missingAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ambos métodos deben tener un monto indicado',
        });
        return;
      }
      const sum = payments.reduce((acc, p) => acc + (p.amount ?? 0), 0);
      if (Math.abs(sum - order_total) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Los montos deben sumar el total de la orden ($${order_total.toFixed(2)})`,
        });
      }
    }
  });

export type SetPaymentsSchema = z.infer<typeof setPaymentsSchema>;
