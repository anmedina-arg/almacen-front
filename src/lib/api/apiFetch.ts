/**
 * Wrapper de fetch para llamadas a /api/* del lado del cliente. Resuelve la
 * Store activa desde el primer segmento de la URL del browser (no usa
 * usePathname() a propósito: la mayoría de los call sites son services
 * planos, no hooks/componentes, y no pueden llamar hooks de React) y arma
 * /<slug>/api/<path> — así ningún caller hardcodea el slug (multi-store-safe
 * para cuando se dé de alta la Store #2).
 */
function getActiveStoreSlug(): string {
  if (typeof window === 'undefined') {
    throw new Error('apiFetch solo puede usarse del lado del cliente.');
  }

  const [, slug] = window.location.pathname.split('/');
  if (!slug) {
    throw new Error('No se pudo resolver la Store activa desde la URL actual.');
  }

  return slug;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const slug = getActiveStoreSlug();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`/${slug}/api${normalizedPath}`, init);
}
