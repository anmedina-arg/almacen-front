import { NextRequest, NextResponse } from 'next/server';
import { products } from '../../mockdata';

/**
 * GET /api/products
 * Obtiene todos los productos activos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    let filteredProducts = products;

    // Filtrar por categoría si se especifica
    if (category) {
      filteredProducts = filteredProducts.filter(
        (product) => product.categories === category
      );
    }

    // Filtrar por estado activo si se especifica
    if (active !== null) {
      const isActive = active === 'true';
      filteredProducts = filteredProducts.filter(
        (product) => product.active === isActive
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredProducts,
      total: filteredProducts.length,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
