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

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      cost,
      cat:categories!products_category_id_fkey(name),
      stock:product_stock(quantity)
    `
    )
    .eq('active', true);

  if (error || !data) {
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }

  // Aggregate: sum(stock * cost) per category
  const totals = new Map<string, number>();

  for (const product of data) {
    const cat = product.cat as unknown as { name: string } | null;
    const stockRows = product.stock as { quantity: number }[] | null;

    const categoryName = cat?.name ?? 'Sin categoría';
    const quantity = stockRows?.[0]?.quantity ?? 0;
    const value = quantity * (product.cost ?? 0);

    totals.set(categoryName, (totals.get(categoryName) ?? 0) + value);
  }

  const result: StockByCategoryItem[] = Array.from(totals.entries())
    .map(([category_name, total_value]) => ({ category_name, total_value: Math.round(total_value) }))
    .filter((item) => item.total_value > 0)
    .sort((a, b) => b.total_value - a.total_value);

  return NextResponse.json(result);
}
