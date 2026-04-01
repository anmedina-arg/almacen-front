import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface StockProductItem {
  id: number;
  name: string;
  sale_type: string;
  stock_raw: number;       // grams for kg/100gr, units otherwise
  cost: number;            // cost per kg / per 100gr / per unit
  stock_value: number;     // stock_raw converted * cost
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const category = request.nextUrl.searchParams.get('category');
  if (!category) {
    return NextResponse.json({ error: 'Missing category param' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: products, error }, { data: stockData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, cost, sale_type, cat:categories!products_category_id_fkey(name)')
      .eq('active', true),
    supabase.from('product_stock').select('product_id, quantity'),
  ]);

  if (error || !products) {
    return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
  }

  const stockMap = new Map<number, number>(
    (stockData ?? []).map((s) => [s.product_id, s.quantity])
  );

  const result: StockProductItem[] = products
    .filter((p) => {
      const cat = p.cat as unknown as { name: string } | null;
      const catName = cat?.name ?? 'Sin categoría';
      return catName === category;
    })
    .map((p) => {
      const stock_raw = stockMap.get(p.id) ?? 0;
      const cost = p.cost ?? 0;
      let stock_value: number;
      switch (p.sale_type) {
        case 'kg':    stock_value = (stock_raw / 1000) * cost; break;
        case '100gr': stock_value = (stock_raw / 100)  * cost; break;
        default:      stock_value = stock_raw * cost;
      }
      return { id: p.id, name: p.name, sale_type: p.sale_type, stock_raw, cost, stock_value: Math.round(stock_value) };
    })
    .filter((p) => p.stock_raw > 0)
    .sort((a, b) => b.stock_value - a.stock_value);

  return NextResponse.json(result);
}
