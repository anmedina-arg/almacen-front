import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface StockSnapshotItem {
  date: string;
  stock: number | null;
  movement_type: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  const { store } = await params;
  const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
  if (!isStoreAdmin || storeId == null) {
    return NextResponse.json({ error: authError || 'Forbidden' }, { status: 403 });
  }

  const productId = Number(request.nextUrl.searchParams.get('product_id'));
  if (!productId) return NextResponse.json({ error: 'product_id requerido' }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // stock_movement_log.store_id queda siempre NULL (gap #52, no corregido
  // acá) — no se puede aislar por Store filtrando esa columna. En cambio,
  // se verifica que el producto pertenezca a esta Store antes de leer su
  // historial (mismo criterio que upsert_product_stock.sql, Stock #17).
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle();
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: 'Product not found in this store' }, { status: 404 });

  const DAYS = 7;
  const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowAr = new Date(Date.now() - AR_OFFSET_MS);
  const todayUtc = new Date(Date.UTC(nowAr.getUTCFullYear(), nowAr.getUTCMonth(), nowAr.getUTCDate()));

  const snapshots: StockSnapshotItem[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const dayUtc = new Date(todayUtc.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = dayUtc.toISOString().split('T')[0];

    if (i === 0) {
      // Hoy: fuente de verdad = product_stock
      const { data } = await supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', productId)
        .single();

      snapshots.push({
        date: dateStr,
        stock: data ? Number(data.quantity) : null,
        movement_type: 'actual',
      });
    } else {
      // Días anteriores: último movimiento antes del cierre del día
      const endOfDay = new Date(dayUtc.getTime() + 24 * 60 * 60 * 1000);

      const { data } = await supabase
        .from('stock_movement_log')
        .select('new_qty, movement_type')
        .eq('product_id', productId)
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      snapshots.push({
        date: dateStr,
        stock: data && data.length > 0 ? Number(data[0].new_qty) : null,
        movement_type: data && data.length > 0 ? data[0].movement_type : null,
      });
    }
  }

  return NextResponse.json(snapshots);
}
