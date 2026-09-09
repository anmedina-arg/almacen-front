/**
 * Corre `fn` sobre `items` con como mucho `limit` en vuelo a la vez, en
 * vez de un `Promise.all` sin límite (#146, spec #139, code review) —
 * pensado para el catálogo público con ~550 productos: sin esto, un cold
 * cache (deploy reciente, o el primer visitante de una Store después de
 * invalidar) dispara esa cantidad de queries simultáneas a Supabase en un
 * solo page load, arriesgando agotar el pool de conexiones. El orden del
 * resultado coincide con el de `items`.
 *
 * Sin fail-fast: si `fn` tira para un item, el `Promise.all` de los
 * workers rechaza y esta función propaga ese error — pero los demás
 * workers que ya estaban en vuelo en ese momento siguen corriendo hasta
 * terminar en segundo plano, no se cancelan (2da pasada de code review de
 * #146). Hoy inofensivo (el único caller, getCachedProductStock en
 * fetchPublicProducts.ts, ya envuelve `fn` en su propio try/catch y nunca
 * tira) — un futuro caller cuyo `fn` sí pueda tirar debería tenerlo en
 * cuenta.
 */
export async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
