import { NextResponse } from 'next/server';
import { NotFoundError, ConflictError } from './errors';

/**
 * Convención única de manejo de errores para rutas de API — resuelve el
 * hallazgo del audit #106 (shape de response en éxito/error inconsistente
 * entre rutas). El service lanza NotFoundError/ConflictError para fallas de
 * negocio esperadas; cualquier otra excepción (error de Supabase no
 * previsto, bug) cae al catch-all como 500, logueado server-side.
 */
export function handleServiceError(error: unknown, context: string): NextResponse {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error(`Error in ${context}:`, error);
  // Nunca el mensaje real acá — puede traer detalle interno (query de
  // Postgres, stack de una excepción no prevista) que no debería llegar a
  // un caller no autenticado en una ruta pública. El detalle real ya quedó
  // logueado server-side arriba.
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
