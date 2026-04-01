import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchPublicProducts } from '@/features/catalog/services/fetchPublicProducts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const categoryIdParam = searchParams.get('categoryId');
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
    const searchParam = searchParams.get('search');
    const search = searchParam ? searchParam.trim() : undefined;

    if (includeInactive) {
      const { isAdmin } = await verifyAdminAuth();
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    const products = await fetchPublicProducts({ includeInactive, categoryId, search });

    return NextResponse.json(products, {
      headers: {
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

export async function POST(request: NextRequest) {
  try {
    // Verificar que sea admin
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
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
