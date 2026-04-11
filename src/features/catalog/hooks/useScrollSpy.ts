'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * rootMargin crea una línea de disparo al 40% desde el top del viewport.
 * Una sección es "activa" cuando su top cruza esa línea.
 */
const SPY_ROOT_MARGIN = '-40% 0px -60% 0px';

/**
 * Selectores de las secciones del catálogo.
 * Usamos section y div para excluir los <a> de los propios badges del FilterButtons.
 */
const SPY_SELECTOR = 'section[data-category], div[data-category]';

export interface UseScrollSpyReturn {
  activeCatName: string | null;
  activeSubName: string | null;
  setActiveCatName: (name: string | null) => void;
  setActiveSubName: (name: string | null) => void;
}

export function useScrollSpy(): UseScrollSpyReturn {
  const [activeCatName, setActiveCatName] = useState<string | null>(null);
  const [activeSubName, setActiveSubName] = useState<string | null>(null);

  const ioRef = useRef<IntersectionObserver | null>(null);
  const observedRef = useRef<Set<Element>>(new Set());

  const observeSection = useCallback((el: Element) => {
    if (observedRef.current.has(el)) return;
    observedRef.current.add(el);
    ioRef.current?.observe(el);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hitting = entries.filter((e) => e.isIntersecting);
        if (hitting.length === 0) return;

        /**
         * Prioridad: secciones de subcategoría sobre secciones de categoría.
         * Evita que el div contenedor tape a la subcategoría activa cuando ambos intersectan.
         */
        const subHits = hitting.filter((e) => e.target.hasAttribute('data-subcategory'));
        const source = subHits.length > 0 ? subHits : hitting;

        const top = source.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );

        const cat = top.target.getAttribute('data-category');
        const sub = top.target.getAttribute('data-subcategory') ?? null;
        if (!cat) return;

        setActiveCatName(cat.toLowerCase());
        setActiveSubName(sub ? sub.toLowerCase() : null);
      },
      { rootMargin: SPY_ROOT_MARGIN },
    );

    ioRef.current = io;
    // Todas las secciones existen en el DOM al montar (SSR completo).
    // No se necesita MutationObserver.
    document.querySelectorAll(SPY_SELECTOR).forEach(observeSection);

    const observedSet = observedRef.current;
    return () => {
      io.disconnect();
      observedSet.clear();
    };
  }, [observeSection]);

  return { activeCatName, activeSubName, setActiveCatName, setActiveSubName };
}
