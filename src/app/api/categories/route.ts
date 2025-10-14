import { NextResponse } from 'next/server';
import { products } from '../../mockdata';

/**
 * GET /api/categories
 * Obtiene todas las categorías únicas
 */
export async function GET() {
  try {
    // Obtener todas las categorías únicas (ignorando vacías)
    const categories = Array.from(
      new Set(products.map((p) => p.categories).filter((cat) => cat))
    );

    return NextResponse.json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
