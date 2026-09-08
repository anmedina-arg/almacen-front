import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { updateOrderItemSchema } from '@/features/orders/schemas/orderSchemas';
import { updateOrderItem, removeOrderItem } from '@/features/orders/services/orderService';

/**
 * DELETE /api/orders/[orderId]/items/[itemId]
 * Remove an item from an order. Admin only.
 * #120 (audit #106): antes devolvía { success: true } — normalizado a 204,
 * convención del resto de las rutas DELETE ya migradas.
 */
export const DELETE = createApiRoute<{ orderId: string; itemId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam, itemId: itemIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    const itemId = parseInt(itemIdParam, 10);
    if (isNaN(orderId) || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    await removeOrderItem(ctx.supabase, ctx.storeId, orderId, itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/orders/[orderId]/items/[itemId]');
  }
});

/**
 * PUT /api/orders/[orderId]/items/[itemId]
 * Update an order item (quantity, unit_price). Admin only.
 */
export const PUT = createApiRoute<{ orderId: string; itemId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam, itemId: itemIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    const itemId = parseInt(itemIdParam, 10);
    if (isNaN(orderId) || isNaN(itemId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = updateOrderItemSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await updateOrderItem(ctx.supabase, ctx.storeId, orderId, itemId, parsed.data);
    return NextResponse.json(item);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/orders/[orderId]/items/[itemId]');
  }
});
