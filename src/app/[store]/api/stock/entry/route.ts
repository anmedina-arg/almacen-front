import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { stockEntryBatchSchema } from '@/features/stock/schemas/stockEntrySchema';
import { batchIncrementStock } from '@/features/stock/services/stockService';
import { productStockTag } from '@/lib/cache/tags';

/**
 * POST /api/stock/entry
 * Incrementa el stock de múltiples productos en un solo lote. Admin
 * only, requiere la flag 'stock' (#122).
 *
 * Un solo round-trip a la base (increment_product_stock_batch, #122 —
 * arregla el N+1 del audit #106). Best-effort por fila preservado: si una
 * entrada falla, las demás igual se aplican.
 *
 * Body: { entries: Array<{ product_id: number; increment: number; notes: string }> }
 * Returns: { results: Array<{ product_id: number; success: boolean; error?: string }> }
 */
export const POST = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = stockEntryBatchSchema.safeParse(body.entries);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const results = await batchIncrementStock(ctx.supabase, ctx.storeId, parsed.data);
    // Invalida solo los productos que efectivamente se ajustaron (#146,
    // spec #139) — respeta el "best-effort por fila" del batch: una
    // entrada fallida no invalida nada, porque no cambió nada.
    for (const result of results) {
      if (result.success) revalidateTag(productStockTag(ctx.storeId, result.product_id));
    }
    return NextResponse.json({ results });
  } catch (error) {
    return handleServiceError(error, 'POST /api/stock/entry');
  }
});
