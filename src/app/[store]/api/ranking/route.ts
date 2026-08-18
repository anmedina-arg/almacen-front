import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;
    const limit = parseInt(searchParams.get('limit') || '10');
    const categoryId = searchParams.get('category_id')
      ? parseInt(searchParams.get('category_id')!)
      : null;
    const metric = searchParams.get('metric') === 'revenue' ? 'revenue' : 'units';

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_top_products', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit,
      p_category_id: categoryId,
      p_metric: metric,
    });

    if (error) {
      console.error('Error calling get_top_products RPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/ranking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
