import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { addOrderItemSchema } from '@/features/orders/schemas/orderSchemas';
import { addOrderItem } from '@/features/orders/services/orderService';

/**
 * POST /api/orders/[orderId]/items
 * Add a new item to an existing order. Admin only.
 */
export const POST = createApiRoute<{ orderId: string }>(requireAdmin)(async (ctx, { orderId: orderIdParam }) => {
  try {
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID de orden invalido' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = addOrderItemSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await addOrderItem(ctx.supabase, ctx.storeId, orderId, parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/orders/[orderId]/items');
  }
});
