/**
 * Errores tipados que un service puede lanzar — capturados por
 * handleServiceError en la ruta, sin acoplar el service a NextResponse.
 * Genéricos a propósito: cualquier dominio los reusa, no son de "products".
 */
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
/** Datos válidos en su tipo pero que violan una regla de negocio (ej. un CHECK constraint) — 400, no 409: no hay otro recurso en conflicto, el request en sí es inválido. */
export class ValidationError extends Error {}
