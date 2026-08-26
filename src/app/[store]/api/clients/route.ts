import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/clients
 * List all clients of the current Store, ordered by barrio + manzana_lote. Admin only.
 */
export const GET = withStoreAdmin(async (_request, { storeId }) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id, barrio, manzana_lote, display_code, created_at')
      .eq('store_id', storeId)
      .order('barrio', { ascending: true })
      .order('manzana_lote', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Error in GET /api/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
