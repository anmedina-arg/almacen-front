import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  try {
    const { store } = await params;
    const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
    if (!isStoreAdmin || storeId == null) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_top_categories', {
      p_store_id: storeId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit,
    });

    if (error) {
      console.error('Error calling get_top_categories RPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/ranking/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
