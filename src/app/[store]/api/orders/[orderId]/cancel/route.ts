import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { cancelOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { cancelOrder } from '@/features/orders/services/orderService';

/**
 * PUT /api/orders/[orderId]/cancel
 * Cancel an order and return its stock. Admin only. Uses the cancel_order
 * RPC to atomically return stock and update status.
 */
export const PUT = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    // Ver nota en confirm/route.ts (#106/#119).
    const body = await ctx.request.json().catch(() => ({}));
    const parsed = cancelOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await cancelOrder(ctx.supabase, ctx.storeId, orderId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/orders/[orderId]/cancel');
  }
});
