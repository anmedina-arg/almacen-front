import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { updateProductSchema } from '@/features/products/schemas/productSchemas';
import { getProductById, updateProduct, deleteProduct } from '@/features/products/services/productService';

/**
 * GET /api/products/[id]
 * Público por default, salvo que el producto esté inactivo — ahí requiere
 * admin (excepción documentada en docs/agents/admin-routes.md, guard
 * llamado inline por la misma razón que GET /api/products).
 */
export const GET = createApiRoute<{ id: string }>()(async (ctx, { id: idParam }) => {
  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await getProductById(ctx.supabase, ctx.storeId, id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.active) {
      const guardResult = await requireAdmin(ctx);
      if (guardResult) {
        // Producto inactivo + no admin: no confirmar ni que existe.
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    // Return with no-cache headers to prevent browser/PWA caching
    return NextResponse.json(product, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/products/[id]');
  }
});

/**
 * PUT /api/products/[id]
 * Actualiza un producto (parcial). Admin only.
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id: idParam }) => {
  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const product = await updateProduct(ctx.supabase, ctx.storeId, id, parsed.data);
    return NextResponse.json(product);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/products/[id]');
  }
});

/**
 * DELETE /api/products/[id]
 * Admin only.
 */
export const DELETE = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id: idParam }) => {
  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    await deleteProduct(ctx.supabase, ctx.storeId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/products/[id]');
  }
});
