import { useState, useCallback, useMemo } from 'react';
import type { Product } from '@/features/catalog/types/catalog.types';

interface POSCartEntry {
  product: Product;
  qty: number;
}

type POSCart = Record<number, POSCartEntry>;

export function usePOSCart() {
  const [cart, setCart] = useState<POSCart>({});

  const add = useCallback((product: Product) => {
    setCart((prev) => {
      const current = prev[product.id];
      const currentQty = current?.qty ?? 0;

      // Respect stock limit
      const stockLimit = product.stock_quantity;
      if (stockLimit !== undefined && stockLimit !== null && currentQty >= stockLimit) {
        return prev;
      }

      return {
        ...prev,
        [product.id]: { product, qty: currentQty + 1 },
      };
    });
  }, []);

  const remove = useCallback((productId: number) => {
    setCart((prev) => {
      const current = prev[productId];
      if (!current || current.qty <= 0) return prev;
      if (current.qty === 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...current, qty: current.qty - 1 } };
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const getQty = useCallback((productId: number) => cart[productId]?.qty ?? 0, [cart]);

  const entries = useMemo(() => Object.values(cart), [cart]);

  const total = useMemo(
    () => entries.reduce((sum, { product, qty }) => sum + product.price * qty, 0),
    [entries]
  );

  const itemCount = useMemo(
    () => entries.reduce((sum, { qty }) => sum + qty, 0),
    [entries]
  );

  return { cart, entries, add, remove, clear, getQty, total, itemCount };
}
