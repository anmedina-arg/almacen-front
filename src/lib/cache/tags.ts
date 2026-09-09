/**
 * Nombres de cache tags de Next.js Data Cache, centralizados (#145, spec
 * #139, ADR-0014) — un solo lugar donde el tag que cachea y el tag que
 * invalida tienen que coincidir. Un typo en cualquiera de los dos lados
 * rompe la invalidación en silencio (sin error, el cache simplemente nunca
 * se refresca), así que esto es más una guarda de correctitud que
 * indirección por las dudas.
 */

/** Metadata de producto (nombre/precio/categoría/combos) de una Store. */
export function productMetadataTag(storeId: number): string {
  return `products:${storeId}`;
}
