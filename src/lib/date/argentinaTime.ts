const AR_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * "Hoy" en hora de Argentina (UTC-3, sin DST), como medianoche UTC de ese
 * día — para poder seguir comparando/restando en UTC sin arrastrar el
 * offset. Se resta el offset antes de leer año/mes/día para que medianoche
 * AR no se cuente como el día siguiente en UTC.
 *
 * Extraído del dashboard (#126, audit #106): la misma constante y el mismo
 * cálculo vivían copiados, sin variar, en 3 rutas distintas.
 */
export function getArgentinaTodayUtc(): Date {
  const nowAr = new Date(Date.now() - AR_OFFSET_MS);
  return new Date(Date.UTC(nowAr.getUTCFullYear(), nowAr.getUTCMonth(), nowAr.getUTCDate()));
}
