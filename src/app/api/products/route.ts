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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Si includeInactive=true, verificar que sea admin
    if (includeInactive) {
      const { isAdmin } = await verifyAdminAuth();
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    const supabase = await createSupabaseClient();

    // Construir query
    let query = supabase
      .from('products')
      .select(
        `
        id,
        name,
        price,
        image,
        active,
        categories,
        mainCategory:main_category
      `
      )
      .order('name', { ascending: true });

    // Filtrar solo activos si no es admin o no pidió includeInactive
    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return with no-cache headers to prevent browser/PWA caching
    return NextResponse.json(data as Product[], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    if (!body.name || body.price == null || !body.mainCategory) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, mainCategory' },
        { status: 400 }
      );
    }

    // NORMALIZAR mainCategory a minúsculas para que coincida con la constraint
    const normalizedCategory = body.mainCategory.toLowerCase();

    const supabase = await createSupabaseClient();

    // Crear producto
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: body.name,
          price: body.price,
          image: body.image || '',
          main_category: normalizedCategory,
          categories: body.categories || '',
          active: body.active ?? true,
        },
      ])
      .select(
        `
        id,
        name,
        price,
        image,
        active,
        categories,
        mainCategory:main_category
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

    return NextResponse.json(data as Product, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
