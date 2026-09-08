import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { updateOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { getOrderById, updateOrder, deleteOrder } from '@/features/orders/services/orderService';

/**
 * GET /api/orders/[orderId]
 * Get a single order with its items. Admin only.
 */
export const GET = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    const order = await getOrderById(ctx.supabase, ctx.storeId, orderId);
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    return NextResponse.json(order, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/orders/[orderId]');
  }
});

/**
 * PUT /api/orders/[orderId]
 * Update an order (status, notes). Admin only.
 */
export const PUT = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const order = await updateOrder(ctx.supabase, ctx.storeId, orderId, parsed.data);
    return NextResponse.json(order);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/orders/[orderId]');
  }
});

/**
 * DELETE /api/orders/[orderId]
 * Permanently delete an order and all its items. Admin only.
 * order_items are removed automatically via ON DELETE CASCADE.
 * Note: stock is NOT restored — handle separately if needed.
 */
export const DELETE = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    await deleteOrder(ctx.supabase, ctx.storeId, orderId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/orders/[orderId]');
  }
});
