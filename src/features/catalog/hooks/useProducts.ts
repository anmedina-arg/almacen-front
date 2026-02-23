'use client';

import { useEffect, useState, useCallback } from 'react';
import { Product } from '../types';
import { productDataSource } from '../services';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((showSpinner: boolean) => {
    if (showSpinner) setIsLoading(true);
    productDataSource
      .getAll()
      .then((data) => setProducts(data))
      .catch(() => setError('Error loading products'))
      .finally(() => { if (showSpinner) setIsLoading(false); });
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  // Refetch silencioso: actualiza el stock sin mostrar spinner
  const refetch = useCallback(() => load(false), [load]);

  return { products, isLoading, error, refetch };
}
