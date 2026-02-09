import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/stock
 * Retorna todos los productos con su nivel de stock usando la vista v_product_stock.
 * Requiere autenticacion de admin.
 */
export async function GET() {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Usar la función RPC optimizada que hace LEFT JOIN en PostgreSQL
    const { data, error } = await supabase.rpc('get_all_products_with_stock');

    if (error) {
      console.error('Error calling RPC get_all_products_with_stock:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
