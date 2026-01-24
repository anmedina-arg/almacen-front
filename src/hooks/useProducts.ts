'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types';
import { productDataSource } from '@/data/products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    productDataSource
      .getAll()
      .then((data) => {
        if (mounted) {
          setProducts(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Error loading products');
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { products, isLoading, error };
}
