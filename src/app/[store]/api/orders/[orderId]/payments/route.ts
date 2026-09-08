import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { setPaymentsSchema } from '@/features/orders/schemas/paymentSchemas';
import { setPayments } from '@/features/orders/services/orderService';

/**
 * PUT /api/orders/[orderId]/payments
 * Replace all payment records for an order. Admin only, requiere la flag
 * 'pagos' (#120 — gap real: antes esto funcionaba igual sin la flag,
 * solo se ocultaba en la UI de OrdersTable).
 * Body: { payments: [{ method, amount? }], order_total: number }
 */
export const PUT = createApiRoute<{ orderId: string }>(requireAdmin, requireFlag('pagos'))(async (ctx, { orderId: orderIdParam }) => {
  try {
    // orderId <= 0: la rutina original (parseOrderId) rechazaba 0 además de
    // NaN — un simple isNaN() lo dejaría pasar (code review de #120).
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = setPaymentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Datos inválidos' }, { status: 400 });
    }

    const payments = await setPayments(ctx.supabase, ctx.storeId, orderId, parsed.data.payments);
    return NextResponse.json(payments);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/orders/[orderId]/payments');
  }
});
