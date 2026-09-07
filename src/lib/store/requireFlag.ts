import { NextResponse } from 'next/server';
import type { Guard } from '@/lib/api/createApiRoute';
import { getStoreFeatureFlags } from './getStoreFeatureFlags';
import type { FeatureFlagKey } from './featureFlags';

/**
 * Guard de feature flag para la pipeline de createApiRoute (#120, ADR-0013:
 * feature flags son un concepto de Store, no de auth — vive junto a
 * featureFlags.ts/getStoreFeatureFlags.ts, no en lib/auth/). Distinto de
 * requireFeatureFlag (guard de página, redirige) — este es de API, devuelve
 * 403 JSON. Se combina con requireAdmin en el orden
 * createApiRoute(requireAdmin, requireFlag('clientes')): primero
 * autenticación, después la regla de negocio de la flag.
 *
 * Antes de #120 esto no existía a nivel API — clientes/payments solo
 * ocultaban UI (OrdersTable), la ruta seguía funcionando igual si alguien
 * le pegaba directo sin la flag activa (gap real, ver #110).
 */
export function requireFlag(flag: FeatureFlagKey): Guard {
  return async (ctx) => {
    const flags = await getStoreFeatureFlags(ctx.supabase, ctx.storeSlug);
    if (!flags[flag]) {
      return NextResponse.json(
        { error: `Forbidden: '${flag}' feature not enabled for this Store` },
        { status: 403 }
      );
    }
  };
}
