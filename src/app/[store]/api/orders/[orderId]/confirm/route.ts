import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { confirmOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { confirmOrder } from '@/features/orders/services/orderService';

/**
 * PUT /api/orders/[orderId]/confirm
 * Confirm an order. Admin only. Uses the confirm_order RPC to enforce
 * business rules (status transition).
 */
export const PUT = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    // #106/#119: no había ningún zod acá — un body con campos inesperados
    // se ignoraba en silencio. confirm/cancel no reciben nada del body (el
    // orderId viene del path), así que el schema solo formaliza "vacío".
    const body = await ctx.request.json().catch(() => ({}));
    const parsed = confirmOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await confirmOrder(ctx.supabase, ctx.storeId, orderId, ctx.userId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/orders/[orderId]/confirm');
  }
});
