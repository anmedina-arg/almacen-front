import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getClients } from '@/features/clients/services/clientService';

/**
 * GET /api/clients
 * List all clients of the current Store, ordered by barrio + manzana_lote. Admin only.
 */
export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const clients = await getClients(ctx.supabase, ctx.storeId);
    return NextResponse.json(clients);
  } catch (error) {
    return handleServiceError(error, 'GET /api/clients');
  }
});
