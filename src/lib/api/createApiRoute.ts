import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';
import { logPerf } from '@/lib/observability/logPerf';

/**
 * Contexto compartido de un request a [store]/api/* — se resuelve UNA vez
 * por request (client de Supabase + storeId), no una vez por guard. Los
 * guards pueden enriquecerlo (ver requireAdmin, que setea userId) antes de
 * que llegue al handler.
 */
export interface RouteContext {
  request: NextRequest;
  supabase: SupabaseClient;
  storeSlug: string;
  storeId: number;
  userId: string | null;
}

/** Un guard corre contra el contexto compartido; NextResponse corta la cadena con esa respuesta, void deja pasar. */
export type Guard = (ctx: RouteContext) => Promise<NextResponse | void>;

type ParamsShape = Record<string, string>;

/**
 * Pipeline de guards contra un contexto compartido — reemplaza el patrón de
 * wrappers anidados (withStoreAdmin(withFeatureFlag(...))), donde cada
 * wrapper resolvía storeId por su cuenta. Ver ADR-0013 (wayfinder #105,
 * ticket #111) — agregar un guard nuevo es agregar un elemento al array,
 * no un nivel de anidamiento.
 */
export function createApiRoute<P extends ParamsShape = ParamsShape>(...guards: Guard[]) {
  return (handler: (ctx: RouteContext, params: P) => Promise<NextResponse>) =>
    async (
      request: NextRequest,
      { params }: { params: Promise<{ store: string } & P> }
    ): Promise<NextResponse> => {
      const startedAt = Date.now();
      // createApiRoute también envuelve rutas públicas sin ningún guard
      // (GET /api/products, POST /api/orders, etc.) — etiquetar todo como
      // "admin_api_guard" mezclaría tráfico público con el costo real del
      // guard de admin que #141 necesita medir (hallazgo de code review).
      const route = guards.length > 0 ? 'admin_api_guard' : 'public_api_route';
      const { store: storeSlug, ...rest } = await params;
      const supabase = await createSupabaseServerClient();
      let storeId: number | null = null;
      let ctx: RouteContext | null = null;

      try {
        storeId = await getStoreIdBySlug(supabase, storeSlug);

        if (storeId == null) {
          return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        ctx = { request, supabase, storeSlug, storeId, userId: null };

        for (const guard of guards) {
          const result = await guard(ctx);
          if (result) return result;
        }
      } finally {
        // Instrumentación temporal (#141, spec #139) — mide resolver
        // storeId + correr los guards, ver docs/diagnostics/2026-09-perf.md
        // (síntoma "acciones de DB lentas"). Ahora envuelve también la
        // resolución de storeId (antes quedaba afuera del timing, otro
        // hallazgo de code review) — sin incluir el handler en sí.
        logPerf(supabase, route, Date.now() - startedAt, storeId);
      }

      return handler(ctx!, rest as unknown as P);
    };
}
