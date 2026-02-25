import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Product } from '@/types';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';

// Helper to create Supabase client with user session
async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies can only be modified in Route Handlers
          }
        },
      },
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        price,
        image,
        active,
        categories,
        mainCategory:main_category,
        sale_type,
        category_id,
        subcategory_id,
        cat:categories!products_category_id_fkey(id, name),
        sub:subcategories!products_subcategory_id_fkey(id, name)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error fetching product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { cat: fetchedCat, sub: fetchedSub, ...fetchedRest } = data as typeof data & { cat?: { id: number; name: string } | null; sub?: { id: number; name: string } | null };
    const product = {
      ...fetchedRest,
      category_name: fetchedCat?.name ?? null,
      subcategory_name: fetchedSub?.name ?? null,
    } as Product;

    // Si el producto está inactivo, solo admins pueden verlo
    if (!product.active) {
      const { isAdmin } = await verifyAdminAuth();
      if (!isAdmin) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    // Return with no-cache headers to prevent browser/PWA caching
    return NextResponse.json(product, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar admin
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await request.json();

    // Construir objeto de actualización
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.price !== undefined) updates.price = body.price;
    if (body.image !== undefined) updates.image = body.image;
    // NORMALIZAR mainCategory a minúsculas para que coincida con la constraint
    if (body.mainCategory !== undefined) updates.main_category = body.mainCategory.toLowerCase();
    if (body.categories !== undefined) updates.categories = body.categories;
    if (body.active !== undefined) updates.active = body.active;
    if (body.sale_type !== undefined) updates.sale_type = body.sale_type;
    // FK-based category fields (Phase 2)
    if ('category_id' in body) updates.category_id = body.category_id ?? null;
    if ('subcategory_id' in body) updates.subcategory_id = body.subcategory_id ?? null;

    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(
        `
        id,
        name,
        price,
        image,
        active,
        categories,
        mainCategory:main_category,
        sale_type,
        category_id,
        subcategory_id,
        cat:categories!products_category_id_fkey(id, name),
        sub:subcategories!products_subcategory_id_fkey(id, name)
      `
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error updating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { cat: updatedCat, sub: updatedSub, ...updatedRest } = data as typeof data & { cat?: { id: number; name: string } | null; sub?: { id: number; name: string } | null };
    const updatedProduct = {
      ...updatedRest,
      category_name: updatedCat?.name ?? null,
      subcategory_name: updatedSub?.name ?? null,
    };
    return NextResponse.json(updatedProduct as Product);
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar admin
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
