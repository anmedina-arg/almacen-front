import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { stockEntryBatchSchema } from '@/features/admin/schemas/stockEntrySchema';

/**
 * POST /api/stock/entry
 * Incrementa el stock de múltiples productos en un solo lote.
 * Usa best-effort: si un item falla, los demás continúan.
 * Requiere autenticación de admin de la Store.
 *
 * Body: { entries: Array<{ product_id: number; increment: number; notes: string }> }
 * Returns: { results: Array<{ product_id: number; success: boolean; error?: string }> }
 */
export const POST = withStoreAdmin(async (request, { storeId }) => {
  try {
    const body = await request.json();
    const parsed = stockEntryBatchSchema.safeParse(body.entries);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const entries = parsed.data;

    const results = await Promise.all(
      entries.map(async (entry) => {
        const { error } = await supabase.rpc('increment_product_stock', {
          p_product_id: entry.product_id,
          p_increment: entry.increment,
          p_notes: entry.notes || null,
          p_store_id: storeId,
        });

        if (error) {
          console.error(
            `Error incrementing stock for product ${entry.product_id}:`,
            error
          );
          return {
            product_id: entry.product_id,
            success: false,
            error: error.message,
          };
        }

        return { product_id: entry.product_id, success: true };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in POST /api/stock/entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
