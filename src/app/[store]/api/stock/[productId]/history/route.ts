import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/stock/[productId]/history
 * Retorna el historial de movimientos de stock de un producto.
 * Requiere autenticacion de admin de la Store.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ store: string; productId: string }> }
) {
  try {
    const { store, productId: productIdParam } = await params;
    const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
    if (!isStoreAdmin || storeId == null) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const productId = parseInt(productIdParam);
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'ID de producto invalido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Se valida contra products.store_id (confiable) en vez de filtrar
    // stock_movement_log por su propio store_id: los triggers que insertan
    // ahí no lo setean todavía (#52, sin resolver), así que filtrar por esa
    // columna ocultaría movimientos reales. Esto además evita que un admin
    // de otra Store vea el historial de un product_id ajeno adivinando el id.
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found in this store' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('stock_movement_log')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock history:', error);
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
    console.error('Error in GET /api/stock/[productId]/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
