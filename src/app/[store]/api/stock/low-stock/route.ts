import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/stock/low-stock
 * Retorna productos con stock por debajo del minimo configurado.
 * Usa la funcion RPC get_low_stock_products.
 * Requiere autenticacion de admin de la Store.
 */
export const GET = withStoreAdmin(async (_request, { storeId }) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_low_stock_products', { p_store_id: storeId });

    if (error) {
      console.error('Error fetching low stock:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/stock/low-stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
