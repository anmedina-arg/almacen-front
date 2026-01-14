'use client';

import { Product } from '@/types';
import { useEffect, useState } from 'react';
import { productsDataSource } from '@/data/products.datasource.provider';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    productsDataSource.getAll().then((data) => {
      if (mounted) {
        setProducts(data);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { products, isLoading };
}
