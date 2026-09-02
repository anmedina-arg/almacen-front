import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';

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
      const { store: storeSlug, ...rest } = await params;
      const supabase = await createSupabaseServerClient();
      const storeId = await getStoreIdBySlug(supabase, storeSlug);

      if (storeId == null) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }

      const ctx: RouteContext = { request, supabase, storeSlug, storeId, userId: null };

      for (const guard of guards) {
        const result = await guard(ctx);
        if (result) return result;
      }

      return handler(ctx, rest as unknown as P);
    };
}
