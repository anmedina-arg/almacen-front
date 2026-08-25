export const FEATURE_FLAG_KEYS = [
  'stock',
  'combos',
  'clientes',
  'pagos',
  'ranking',
  'pos',
  'dashboard',
  'informes',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

/**
 * Normaliza el JSONB crudo de stores.feature_flags a un objeto con las 8
 * keys siempre presentes. El catálogo de flags (#23) las declara "todas
 * requeridas" — omitir una es un estado inválido al escribir — pero el
 * código que LEE los flags no debe romper por eso: cualquier key faltante,
 * o con un valor que no sea boolean, se resuelve a false (apagado). Mismo
 * criterio defensivo que resolveWhatsappNumber.ts.
 */
export function resolveFeatureFlags(raw: unknown): FeatureFlags {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    FEATURE_FLAG_KEYS.map((key) => [key, source[key] === true])
  ) as FeatureFlags;
}
