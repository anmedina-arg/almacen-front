import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from './roleHelpers';

export type StoreAdminAuth = {
  storeId: number;
  userId: string;
};

type RouteContext<P extends Record<string, string>> = {
  params: Promise<{ store: string } & P>;
};

/**
 * Envuelve un handler de ruta bajo [store]/api/ que requiere ser Store
 * admin o Platform admin — ver docs/agents/admin-routes.md. Reemplaza el
 * ritual verifyStoreAdminAuth(store) + chequeo manual + 403 repetido antes
 * en 46 call sites de 36 archivos (#101), mismo movimiento que isAdminRole
 * hizo con el predicado en sí (#43), un nivel más arriba en la pila.
 *
 * Params dinámicos propios de la ruta más allá de `store` (orderId, id,
 * etc.) se declaran vía el genérico P — el wrapper solo resuelve `store`,
 * el resto lo sigue leyendo cada handler de `ctx.params` como siempre.
 *
 * Sin caché entre requests: cada pedido vuelve a verificar contra la base.
 * Decisión deliberada, no un olvido — ver el doc de arriba.
 */
export function withStoreAdmin<P extends Record<string, string> = Record<string, string>>(
  handler: (
    request: NextRequest,
    auth: StoreAdminAuth,
    ctx: RouteContext<P>
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, ctx: RouteContext<P>): Promise<NextResponse> => {
    const { store } = await ctx.params;
    const { isStoreAdmin, storeId, userId, error } = await verifyStoreAdminAuth(store);

    if (!isStoreAdmin || storeId == null || userId == null) {
      return NextResponse.json(
        { error: error || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return handler(request, { storeId, userId }, ctx);
  };
}
