import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/types';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        price,
        cost,
        image,
        active,
        categories,
        mainCategory:main_category,
        sale_type,
        is_combo,
        max_stock,
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
    if (body.cost !== undefined) updates.cost = body.cost;
    if (body.image !== undefined) updates.image = body.image;
    // NORMALIZAR mainCategory a minúsculas para que coincida con la constraint
    if (body.mainCategory !== undefined) updates.main_category = body.mainCategory.toLowerCase();
    if (body.categories !== undefined) updates.categories = body.categories;
    if (body.active !== undefined) updates.active = body.active;
    if (body.sale_type !== undefined) updates.sale_type = body.sale_type;
    if (body.is_combo !== undefined) updates.is_combo = body.is_combo;
    if ('max_stock' in body) updates.max_stock = body.max_stock ?? null;
    // FK-based category fields (Phase 2)
    if ('category_id' in body) updates.category_id = body.category_id ?? null;
    if ('subcategory_id' in body) updates.subcategory_id = body.subcategory_id ?? null;

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(
        `
        id,
        name,
        price,
        cost,
        image,
        active,
        categories,
        mainCategory:main_category,
        sale_type,
        is_combo,
        max_stock,
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

    // Si el costo pasó a ser > 0, corregir order_items que tengan unit_cost = 0
    // en órdenes pending/confirmed (snapshot era 0 porque el producto no tenía costo)
    const newCost = typeof body.cost === 'number' ? body.cost : null;
    if (newCost !== null && newCost > 0) {
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['pending', 'confirmed']);

      if (activeOrders && activeOrders.length > 0) {
        const orderIds = activeOrders.map((o: { id: number }) => o.id);
        await supabase
          .from('order_items')
          .update({ unit_cost: newCost })
          .eq('product_id', id)
          .in('order_id', orderIds)
          .or('unit_cost.eq.0,unit_cost.is.null');
      }
    }

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

    const supabase = await createSupabaseServerClient();

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
