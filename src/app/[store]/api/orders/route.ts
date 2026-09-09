import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { createOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { getOrders, createOrder, InsufficientStockError } from '@/features/orders/services/orderService';
import { invalidateOrderStockTags } from '@/features/orders/services/invalidateOrderStock';

/**
 * GET /api/orders
 * List all orders with computed margin. Admin only.
 */
export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const orders = await getOrders(ctx.supabase, ctx.storeId);
    return NextResponse.json(orders, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/orders');
  }
});

/**
 * POST /api/orders
 * Create a new order. Público — sin login, sostiene el checkout por
 * WhatsApp (excepción documentada en docs/agents/admin-routes.md).
 */
export const POST = createApiRoute()(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await createOrder(ctx.supabase, ctx.storeId, parsed.data);
    // Invalida solo el stock de los productos de esta orden, combos
    // incluidos (#146, spec #139) — el resto del catálogo sigue
    // sirviéndose de cache.
    await invalidateOrderStockTags(ctx.supabase, ctx.storeId, parsed.data.items);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: 'insufficient_stock', products: error.products }, { status: 409 });
    }
    return handleServiceError(error, 'POST /api/orders');
  }
});
