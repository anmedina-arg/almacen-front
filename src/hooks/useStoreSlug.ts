'use client';

import { usePathname } from 'next/navigation';
import { getSlugFromPathname } from '@/lib/store/slug';

/** Slug de la Store activa, derivado del primer segmento de la URL actual. */
export function useStoreSlug(): string {
  const pathname = usePathname();
  return getSlugFromPathname(pathname);
}
