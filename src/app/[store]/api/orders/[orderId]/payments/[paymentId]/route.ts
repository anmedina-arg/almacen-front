import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { deletePayment } from '@/features/orders/services/orderService';

/**
 * DELETE /api/orders/[orderId]/payments/[paymentId]
 * Remove one payment from an order. Admin only, requiere la flag 'pagos'
 * (#120). Si el pago restante tiene un monto, se limpia (un solo método =
 * cubre el total de la orden).
 */
export const DELETE = createApiRoute<{ orderId: string; paymentId: string }>(requireAdmin, requireFlag('pagos'))(async (ctx, { orderId: orderIdParam, paymentId: paymentIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    const paymentId = parseInt(paymentIdParam, 10);
    if (isNaN(orderId) || isNaN(paymentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await deletePayment(ctx.supabase, ctx.storeId, orderId, paymentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/orders/[orderId]/payments/[paymentId]');
  }
});
