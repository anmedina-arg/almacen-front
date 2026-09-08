import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { familiaSchema } from '@/features/products/schemas/familiaSchemas';
import { listFamilias, createFamilia } from '@/features/products/services/familiaService';

/**
 * GET /api/familias
 * Público (no admin) — el catálogo público necesita listar Variedades
 * disponibles para un Producto Surtido sin login.
 * Query param: ?include=variedades → devuelve FamiliaWithVariedades[]
 */
export const GET = createApiRoute()(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const includeVariedades = searchParams.get('include') === 'variedades';

    const familias = await listFamilias(ctx.supabase, ctx.storeId, { includeVariedades });
    return NextResponse.json(familias);
  } catch (error) {
    return handleServiceError(error, 'GET /api/familias');
  }
});

/**
 * POST /api/familias
 * Crea una familia. Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const familia = await createFamilia(ctx.supabase, ctx.storeId, parsed.data);
    return NextResponse.json(familia, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/familias');
  }
});
