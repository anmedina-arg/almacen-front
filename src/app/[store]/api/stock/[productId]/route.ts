import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { stockUpdateSchema } from '@/features/stock/schemas/stockUpdateSchema';
import { upsertProductStock } from '@/features/stock/services/stockService';

/**
 * PUT /api/stock/[productId]
 * Crea o actualiza el stock de un producto. Admin only, requiere la flag
 * 'stock' (#122).
 *
 * Body esperado: { p_product_id, p_quantity, p_min_stock, p_notes, p_movement_type }
 */
export const PUT = createApiRoute<{ productId: string }>(requireAdmin, requireFlag('stock'))(async (ctx, { productId: productIdParam }) => {
  try {
    const productId = parseInt(productIdParam, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'ID de producto invalido' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = stockUpdateSchema.safeParse({
      productId,
      quantity: body.p_quantity,
      minStock: body.p_min_stock,
      movementType: body.p_movement_type,
      notes: body.p_notes || '',
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await upsertProductStock(ctx.supabase, ctx.storeId, productId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/stock/[productId]');
  }
});
