import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { createProductSchema } from '@/features/products/schemas/productSchemas';
import { createProduct } from '@/features/products/services/productService';
import { fetchPublicProducts } from '@/features/catalog/services/fetchPublicProducts';
import { productMetadataTag } from '@/lib/cache/tags';

/**
 * GET /api/products
 * Público por default (catálogo). `includeInactive=true` requiere admin —
 * excepción documentada en docs/agents/admin-routes.md: el mismo handler
 * mezcla público/admin, así que el guard se llama inline en vez de en el
 * pipeline de createApiRoute (que aplicaría a TODO el método).
 */
export const GET = createApiRoute()(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const categoryIdParam = searchParams.get('categoryId');
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
    const searchParam = searchParams.get('search');
    const search = searchParam ? searchParam.trim() : undefined;

    if (includeInactive) {
      const guardResult = await requireAdmin(ctx);
      if (guardResult) return guardResult;
    }

    const products = await fetchPublicProducts(ctx.storeId, { includeInactive, categoryId, search });

    // Catálogo público completo: cacheable en CDN (Vercel Edge) por 5 min,
    // stale-while-revalidate por 1 hora.
    // Requests con search, categoryId o includeInactive no se cachean.
    const isPublicCatalog = !includeInactive && !search && categoryId == null;

    return NextResponse.json(products, {
      headers: isPublicCatalog
        ? { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' }
        : {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/products');
  }
});

/**
 * POST /api/products
 * Crea un producto. Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const product = await createProduct(ctx.supabase, ctx.storeId, parsed.data);
    // Invalida el cache de metadata (#145, spec #139) para que el
    // catálogo público refleje el alta al instante, no recién cuando
    // expire un TTL (no hay TTL — solo se invalida por evento).
    revalidateTag(productMetadataTag(ctx.storeId));
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/products');
  }
});
