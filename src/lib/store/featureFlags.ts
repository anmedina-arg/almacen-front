/**
 * `combos` se retiró como flag acá (#117, ADR-0013 resuelve la pregunta que
 * ADR-0012 había dejado abierta) — pasa a ser siempre-encendida, parte del
 * dominio Products, mismo criterio que Producto Surtido (que nunca fue
 * flag). `costos` se sumó en #183 (ADR-0018): campos y columnas de costo y margen.
 */
export const FEATURE_FLAG_KEYS = [
  'stock',
  'clientes',
  'pagos',
  'ranking',
  'pos',
  'dashboard',
  'informes',
  'costos',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

/**
 * Normaliza el JSONB crudo de stores.feature_flags a un objeto con las
 * keys del catálogo siempre presentes. El catálogo de flags (#23) las declara "todas
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
