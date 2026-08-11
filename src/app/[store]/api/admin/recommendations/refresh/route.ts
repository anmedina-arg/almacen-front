import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/recommendations/refresh
 * Recalculates product affinity matrix from order co-occurrences (last 30 days).
 * Admin only.
 */
export async function POST() {
  const { isAdmin, error: authError } = await verifyAdminAuth();
  if (!isAdmin) {
    return NextResponse.json(
      { error: authError || 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('refresh_product_affinity');

    if (error) {
      console.error('[POST /api/admin/recommendations/refresh] RPC error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/admin/recommendations/refresh] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
