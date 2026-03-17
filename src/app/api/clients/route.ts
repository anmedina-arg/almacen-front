import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/clients
 * List all clients ordered by barrio + manzana_lote. Admin only.
 */
export async function GET() {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id, barrio, manzana_lote, display_code, created_at')
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
}
