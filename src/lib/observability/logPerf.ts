import type { SupabaseClient } from '@supabase/supabase-js';
import { after } from 'next/server';

/**
 * Registra la duración de una ruta instrumentada en `perf_logs` (#141,
 * spec #139) — para poder comparar antes/después de cada fix de
 * performance con una query SQL, en vez de logs de stdout sueltos sin
 * retención.
 *
 * Recibe el `supabase` ya instanciado en el caller (no crea uno propio) —
 * a diferencia de una primera versión de este archivo, que instanciaba su
 * propio cliente: eso agregaba una conexión extra por request, justo el
 * problema que el diagnóstico de #139 (causa #3) señala. Los 3 call sites
 * (fetchPublicProducts, verifyStoreAdminAuth, createApiRoute) ya tienen un
 * cliente en scope.
 *
 * El insert corre dentro de `after()` (Next 15, estable) — sin esto, en
 * Vercel la función serverless puede congelarse apenas se envía la
 * respuesta, antes de que el insert (que no se await'ea desde el caller)
 * termine de viajar por red, perdiendo filas silenciosamente. `after()`
 * mantiene la invocación viva hasta que el callback resuelve.
 *
 * Nunca debe romper ni enlentecer la ruta real que mide — cualquier error,
 * incluido un rechazo de la promesa (red caída, Supabase no disponible),
 * se traga acá.
 */
export function logPerf(
  supabase: SupabaseClient,
  route: string,
  durationMs: number,
  storeId?: number | null
): void {
  try {
    // after() en sí puede tirar sincrónicamente si se llama fuera de un
    // scope de request real (ver code review de #141) — se llama siempre
    // desde un finally de una ruta real hoy, pero un try/catch acá evita
    // que ese throw se cuele y pise el valor/excepción real del try que lo
    // envuelve, justo lo que este helper promete no hacer nunca.
    after(async () => {
      try {
        const { error } = await supabase
          .from('perf_logs')
          .insert({ route, duration_ms: durationMs, store_id: storeId ?? null });
        if (error) console.error('[logPerf] insert error:', error.message);
      } catch (err) {
        console.error('[logPerf] unexpected error:', err instanceof Error ? err.message : err);
      }
    });
  } catch (err) {
    console.error('[logPerf] after() unavailable:', err instanceof Error ? err.message : err);
  }
}
