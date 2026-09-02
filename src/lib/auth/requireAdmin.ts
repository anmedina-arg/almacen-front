import { NextResponse } from 'next/server';
import type { Guard } from '@/lib/api/createApiRoute';
import { resolveStoreAdminStatus } from '@/features/auth/utils/roleHelpers';

/**
 * Guard de admin para la pipeline de createApiRoute — mismo chequeo que
 * withStoreAdmin (verifyStoreAdminAuth), pero reutiliza el client y el
 * storeId ya resueltos por createApiRoute en vez de crear los suyos
 * propios. withStoreAdmin sigue existiendo para las ~39 rutas que todavía
 * no migraron (ver ADR-0013) — no se toca en este ticket.
 *
 * resolveStoreAdminStatus vuelve a resolver storeId internamente por su
 * propio slug — sin costo real: getStoreIdBySlug está envuelto en cache()
 * (memoiza por request mientras el client sea el mismo objeto, y acá sí lo
 * es porque ctx.supabase viene de createApiRoute).
 */
export const requireAdmin: Guard = async (ctx) => {
  const {
    data: { user },
    error: userError,
  } = await ctx.supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
  }

  const { isStoreAdmin, error } = await resolveStoreAdminStatus(ctx.supabase, user.id, ctx.storeSlug);
  if (!isStoreAdmin) {
    return NextResponse.json(
      { error: error || 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  ctx.userId = user.id;
};
