import { getSlugFromPathname } from '@/lib/store/slug';

/**
 * Wrapper de fetch para llamadas a /api/* del lado del cliente. Resuelve la
 * Store activa desde el primer segmento de la URL del browser (no usa
 * usePathname() a propósito: la mayoría de los call sites son services
 * planos, no hooks/componentes, y no pueden llamar hooks de React) y arma
 * /<slug>/api/<path> — así ningún caller hardcodea el slug (multi-store-safe
 * para cuando se dé de alta la Store #2).
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    throw new Error('apiFetch solo puede usarse del lado del cliente.');
  }

  const slug = getSlugFromPathname(window.location.pathname);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`/${slug}/api${normalizedPath}`, init);
}

/**
 * `error.error` puede ser un string (la mayoría de las rutas) o el shape de
 * z.flatten() (rutas migradas a la capa de servicios, ver #115/#116:
 * `{ error: parsed.error.flatten() }` en un 400) — sin esto, `new
 * Error(objeto)` termina mostrando el `[object Object]` de String(objeto)
 * en vez de un mensaje legible.
 */
export function extractErrorMessage(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | undefined)?.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const flattened = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const firstFieldError = flattened.fieldErrors
      ? Object.values(flattened.fieldErrors).flat()[0]
      : undefined;
    return flattened.formErrors?.[0] || firstFieldError || fallback;
  }
  return fallback;
}
