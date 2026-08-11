/**
 * Extrae el slug de la Store activa (primer segmento) de un pathname.
 * Función pura — compartida entre apiFetch (window.location.pathname, para
 * services planos que no pueden usar hooks), useStoreSlug (usePathname(),
 * para componentes/hooks de React) y authService (redirect de OAuth), para
 * no reimplementar "primer segmento de la URL" en cada lugar.
 */
export function getSlugFromPathname(pathname: string): string {
  const [, slug] = pathname.split('/');
  if (!slug) {
    throw new Error(`No se pudo resolver la Store activa desde el path "${pathname}".`);
  }
  return slug;
}
