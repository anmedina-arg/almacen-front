import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { RecommendedProduct } from '@/features/catalog/types/recommendation.types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse product_ids[] from query: ?product_ids=1&product_ids=2
  const productIds = searchParams.getAll('product_ids').map(Number).filter(Boolean);
  const excludeIds = searchParams.getAll('exclude_ids').map(Number).filter(Boolean);
  const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 10);

  if (productIds.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_recommendations', {
      p_product_ids: productIds,
      p_exclude_ids: excludeIds.length > 0 ? excludeIds : [],
      p_limit: limit,
    });

    if (rpcError) {
      console.error('[GET /api/recommendations] RPC error:', rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!rpcData || rpcData.length === 0) {
      return NextResponse.json([]);
    }

    const recommendedIds: number[] = rpcData.map((r: { product_id: number }) => r.product_id);
    const scoreMap = new Map<number, number>(
      rpcData.map((r: { product_id: number; score: number }) => [r.product_id, r.score])
    );

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select(
        `id, name, price, cost, image, active, categories,
         mainCategory:main_category, sale_type, is_combo, max_stock,
         category_id, subcategory_id,
         cat:categories!products_category_id_fkey(id, name),
         sub:subcategories!products_subcategory_id_fkey(id, name)`
      )
      .in('id', recommendedIds)
      .eq('active', true);

    if (prodError || !products) {
      return NextResponse.json([]);
    }

    const { data: stockData } = await supabase
      .from('product_stock')
      .select('product_id, quantity')
      .in('product_id', recommendedIds);

    const stockMap = new Map<number, number>(
      (stockData ?? []).map((s) => [s.product_id, s.quantity])
    );

    const result: RecommendedProduct[] = recommendedIds
      .map((pid) => {
        const p = products.find((x) => x.id === pid);
        if (!p) return null;
        const { cat, sub, ...rest } = p as typeof p & {
          cat?: { id: number; name: string } | null;
          sub?: { id: number; name: string } | null;
        };
        return {
          ...rest,
          category_name: cat?.name ?? null,
          subcategory_name: sub?.name ?? null,
          stock_quantity: stockMap.has(pid) ? stockMap.get(pid) : undefined,
          affinity_score: scoreMap.get(pid) ?? 0,
        } as RecommendedProduct;
      })
      .filter((x): x is RecommendedProduct => x !== null);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[GET /api/recommendations] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
