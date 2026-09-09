import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { cancelOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { cancelOrder } from '@/features/orders/services/orderService';
import { invalidateOrderStockTags } from '@/features/orders/services/invalidateOrderStock';

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
    // cancel_order() devuelve stock real (ver cancel_order.sql) pero el
    // RPC solo informa items_returned (un conteo) — sin product_ids en la
    // respuesta, se resuelven con un lookup chico aparte (#146, spec #139,
    // mismo criterio que items/[itemId]/route.ts).
    const { data: orderItems, error: orderItemsError } = await ctx.supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId);
    // No tira: la cancelación ya se aplicó (stock devuelto de verdad en
    // la base) — un error acá solo afecta la precisión del cache, no la
    // corrección de la operación. Sí se loguea (3ra pasada de code
    // review de #146) para no perder el rastro si esto empieza a fallar.
    if (orderItemsError) {
      console.error('[cancel order] order_items lookup error:', orderItemsError.message);
    }
    const itemsWithProductId = (orderItems ?? []).filter(
      (item): item is { product_id: number } => item.product_id != null
    );
    await invalidateOrderStockTags(ctx.supabase, ctx.storeId, itemsWithProductId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/orders/[orderId]/cancel');
  }
});
