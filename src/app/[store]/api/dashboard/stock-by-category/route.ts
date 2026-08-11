import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface StockByCategoryItem {
  category_name: string;
  total_value: number;
}

export async function GET() {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: products, error: productsError }, { data: stockData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, cost, sale_type, cat:categories!products_category_id_fkey(name)')
      .eq('active', true),
    supabase.from('product_stock').select('product_id, quantity'),
  ]);

  if (productsError || !products) {
    return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
  }

  const stockMap = new Map<number, number>(
    (stockData ?? []).map((s) => [s.product_id, s.quantity])
  );

  const totals = new Map<string, number>();

  for (const product of products) {
    const cat = product.cat as unknown as { name: string } | null;
    const categoryName = cat?.name ?? 'Sin categoría';
    const stockGrams = stockMap.get(product.id) ?? 0;
    const cost = product.cost ?? 0;
    let value: number;
    switch (product.sale_type) {
      case 'kg':    value = (stockGrams / 1000) * cost; break;
      case '100gr': value = (stockGrams / 100)  * cost; break;
      default:      value = stockGrams * cost;
    }

    totals.set(categoryName, (totals.get(categoryName) ?? 0) + value);
  }

  const result: StockByCategoryItem[] = Array.from(totals.entries())
    .map(([category_name, total_value]) => ({ category_name, total_value: Math.round(total_value) }))
    .filter((item) => item.total_value > 0)
    .sort((a, b) => b.total_value - a.total_value);

  return NextResponse.json(result);
}
