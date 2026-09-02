/**
 * Errores tipados que un service puede lanzar — capturados por
 * handleServiceError en la ruta, sin acoplar el service a NextResponse.
 * Genéricos a propósito: cualquier dominio los reusa, no son de "products".
 */
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
