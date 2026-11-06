import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { updateOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { getOrderById, updateOrder, deleteOrder } from '@/features/orders/services/orderService';
import { invalidateProductStockTags } from '@/features/products/services/invalidateProductStock';

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
 * Stock (#164): a pending order returns its stock (DB trigger
 * return_stock_on_order_delete); confirmed and cancelled orders don't move
 * stock. #163: when stock did move, the catalog's cached stock for those
 * products (plus combo components/parents) is invalidated, same as
 * cancel/route.ts and items/[itemId]/route.ts.
 */
export const DELETE = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    const deleted = await deleteOrder(ctx.supabase, ctx.storeId, orderId);
    // Solo un pendiente movió stock (#164): invalidar en otro estado sería
    // una query + eviction desperdiciada (mismo criterio que el PUT de
    // items/[itemId]/route.ts, que no invalida si solo cambió unit_price).
    if (deleted.status === 'pending' && deleted.productIds.length > 0) {
      await invalidateProductStockTags(ctx.supabase, ctx.storeId, deleted.productIds);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/orders/[orderId]');
  }
});
