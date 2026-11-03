'use client';

import { useEffect, useRef } from 'react';

/**
 * Zona fija del catálogo (#176): buscador y categorías. Fondo blanco sólido y
 * una línea abajo, sin translucidez. Publica su altura real en la variable CSS
 * `--catalog-sticky-h` para que las secciones del listado dejen su título justo
 * debajo al saltar desde una categoría (ver ProductList), sea cual sea la
 * altura que tenga en cada tienda.
 *
 * z-40: el encabezado de la página (z-50) queda por encima para que su menú de
 * usuario no quede tapado.
 */
export function StickyCatalogZone({ children }: { children: React.ReactNode }) {
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const root = document.documentElement;
    const publishHeight = () => root.style.setProperty('--catalog-sticky-h', `${zone.offsetHeight}px`);

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(zone);

    return () => {
      observer.disconnect();
      root.style.removeProperty('--catalog-sticky-h');
    };
  }, []);

  return (
    <div ref={zoneRef} className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      {children}
    </div>
  );
}
