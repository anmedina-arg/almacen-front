import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface StockByCategoryItem {
  category_name: string;
  total_value: number;
}

export const GET = withStoreAdmin(async (_request, { storeId }) => {
  const supabase = await createSupabaseServerClient();

  // products tiene una policy de lectura pública sin restricción de Store
  // (catálogo público) — el filtro por store_id acá tiene que ser explícito
  // en la query, RLS por sí sola no aisla esta tabla para un contexto
  // admin. product_stock se sigue trayendo sin filtrar (igual que antes):
  // el stockMap de abajo solo se consulta con ids de `products`, que ya
  // vienen filtrados, y filtrar product_stock.store_id directamente
  // ocultaría stock legacy cuyo store_id todavía no se backfilleó (mismo
  // motivo documentado en get_all_products_with_stock.sql, Stock #17).
  const [{ data: products, error: productsError }, { data: stockData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, cost, sale_type, cat:categories!products_category_id_fkey(name)')
      .eq('active', true)
      .eq('store_id', storeId),
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
});
