import { z } from 'zod';

/**
 * refresh no recibe ningún campo de negocio — recalcula la afinidad para
 * la Store del caller, sin body. `.strict()` formaliza "vacío" (#106,
 * #125): antes no había ningún zod acá, un body con campos inesperados se
 * aceptaba en silencio sin efecto — mismo criterio que confirm/cancel de
 * Orders (#119).
 */
export const refreshAffinitySchema = z.object({}).strict();
