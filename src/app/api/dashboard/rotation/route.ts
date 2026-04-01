import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RotationItem {
  id: number;
  name: string;
  category_name: string;
  sale_type: string;
  units_sold: number;   // raw: grams for kg/100gr, units otherwise
  avg_stock: number;    // raw: same unit as units_sold
  rotation: number;     // units_sold / avg_stock (dimensionless)
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const days = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 30), 365);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startIso = startDate.toISOString();

  const supabase = await createSupabaseServerClient();

  const [ordersRes, movementsRes, productsRes, stockRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'confirmed'])
      .gte('created_at', startIso),

    supabase
      .from('stock_movement_log')
      .select('product_id, new_qty')
      .gte('created_at', startIso),

    supabase
      .from('products')
      .select('id, name, sale_type, cat:categories!products_category_id_fkey(name)')
      .eq('active', true),

    supabase
      .from('product_stock')
      .select('product_id, quantity'),
  ]);

  if (ordersRes.error || productsRes.error) {
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }

  const orderIds = (ordersRes.data ?? []).map((o) => o.id);
  if (orderIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: itemsData } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .in('order_id', orderIds);

  // Sales per product
  const salesMap = new Map<number, number>();
  for (const item of itemsData ?? []) {
    if (item.product_id == null) continue;
    salesMap.set(item.product_id, (salesMap.get(item.product_id) ?? 0) + Number(item.quantity));
  }

  // Average stock per product from movement log; fallback to current stock
  const movSumMap = new Map<number, { sum: number; count: number }>();
  for (const row of movementsRes.data ?? []) {
    const acc = movSumMap.get(row.product_id) ?? { sum: 0, count: 0 };
    acc.sum += Number(row.new_qty);
    acc.count += 1;
    movSumMap.set(row.product_id, acc);
  }

  const currentStockMap = new Map<number, number>(
    (stockRes.data ?? []).map((s) => [s.product_id, Number(s.quantity)])
  );

  const result: RotationItem[] = [];

  for (const product of productsRes.data ?? []) {
    const units_sold = salesMap.get(product.id) ?? 0;
    if (units_sold === 0) continue; // skip products with no sales in period

    const movData = movSumMap.get(product.id);
    const avg_stock = movData
      ? movData.sum / movData.count
      : (currentStockMap.get(product.id) ?? 0);

    if (avg_stock === 0) continue; // skip: can't compute rotation

    const cat = product.cat as unknown as { name: string } | null;
    result.push({
      id: product.id,
      name: product.name,
      category_name: cat?.name ?? 'Sin categoría',
      sale_type: product.sale_type,
      units_sold,
      avg_stock,
      rotation: units_sold / avg_stock,
    });
  }

  result.sort((a, b) => b.rotation - a.rotation);

  return NextResponse.json(result);
}
