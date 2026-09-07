import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { posOrderSchema } from '@/features/orders/schemas/orderSchemas';
import { createOrder, InsufficientStockError } from '@/features/orders/services/orderService';

/**
 * POST /api/pos/orders
 * Creates an order from the admin Point of Sale panel. Admin only.
 *
 * #121: POS es otro punto de entrada al mismo dominio Orders (ADR-0013),
 * no un flujo propio — reusa orderService.createOrder(), el mismo que usa
 * el checkout público de WhatsApp (#119). unit_cost del body se ignora a
 * propósito: createOrder() ya lo recalcula server-side desde el
 * precio/costo vigente del producto, con un resultado matemáticamente
 * equivalente acá (ver comentario en posOrderItemSchema).
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = posOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Datos inválidos' }, { status: 400 });
    }

    const { customer_name, items } = parsed.data;
    const notes = customer_name?.trim() || 'Venta directa';

    const result = await createOrder(ctx.supabase, ctx.storeId, {
      notes,
      whatsapp_message: `[POS] ${notes}`,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_by_weight: item.is_by_weight,
        from_suggestion: false,
      })),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: 'insufficient_stock', products: error.products }, { status: 409 });
    }
    return handleServiceError(error, 'POST /api/pos/orders');
  }
});
