'use client';

import { Product } from '@/types';
import { useEffect, useState } from 'react';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    import('@/app/mockdata_fixed_ids').then((mod) => {
      if (mounted) {
        setProducts(mod.products);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { products, isLoading };
}
