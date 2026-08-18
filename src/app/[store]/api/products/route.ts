import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';
import { fetchPublicProducts } from '@/features/catalog/services/fetchPublicProducts';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  try {
    const { store } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const categoryIdParam = searchParams.get('categoryId');
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
    const searchParam = searchParams.get('search');
    const search = searchParam ? searchParam.trim() : undefined;

    let storeId: number | null;
    if (includeInactive) {
      const { isStoreAdmin, storeId: adminStoreId } = await verifyStoreAdminAuth(store);
      if (!isStoreAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
      storeId = adminStoreId;
    } else {
      const supabase = await createSupabaseServerClient();
      storeId = await getStoreIdBySlug(supabase, store);
    }

    if (storeId == null) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const products = await fetchPublicProducts(storeId, { includeInactive, categoryId, search });

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
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  try {
    const { store } = await params;
    // Verificar que sea admin de esta Store
    const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
    if (!isStoreAdmin || storeId == null) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validar datos básicos
    if (!body.name || body.price == null) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price' },
        { status: 400 }
      );
    }

    // NORMALIZAR mainCategory a minúsculas para que coincida con la constraint
    const normalizedCategory = body.mainCategory ? body.mainCategory.toLowerCase() : 'otros';

    const supabase = await createSupabaseServerClient();

    // category_id/subcategory_id deben pertenecer a esta Store — si no, un
    // admin podría colgar un producto de una categoría ajena (mismo caso
    // que ya se verifica en POST /api/categories/[id]/subcategories).
    if (body.category_id != null) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('id', body.category_id)
        .eq('store_id', storeId)
        .maybeSingle();
      if (!cat) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }
    if (body.subcategory_id != null) {
      const { data: sub } = await supabase
        .from('subcategories')
        .select('id')
        .eq('id', body.subcategory_id)
        .eq('store_id', storeId)
        .maybeSingle();
      if (!sub) {
        return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
      }
    }

    // Crear producto
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: body.name,
          price: body.price,
          cost: body.cost ?? 0,
          image: body.image || '',
          main_category: normalizedCategory,
          categories: body.categories || '',
          active: body.active ?? true,
          sale_type: body.sale_type ?? 'unit',
          is_combo: body.is_combo ?? false,
          max_stock: body.max_stock ?? null,
          category_id: body.category_id ?? null,
          subcategory_id: body.subcategory_id ?? null,
          store_id: storeId,
        },
      ])
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
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const { cat: insertedCat, sub: insertedSub, ...insertedRest } = data as typeof data & { cat?: { id: number; name: string } | null; sub?: { id: number; name: string } | null };
    const product = {
      ...insertedRest,
      category_name: insertedCat?.name ?? null,
      subcategory_name: insertedSub?.name ?? null,
    };
    return NextResponse.json(product as Product, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
