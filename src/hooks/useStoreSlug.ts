'use client';

import { usePathname } from 'next/navigation';

/** Slug de la Store activa, derivado del primer segmento de la URL actual. */
export function useStoreSlug(): string {
  const pathname = usePathname();
  const [, slug] = pathname.split('/');
  return slug;
}
