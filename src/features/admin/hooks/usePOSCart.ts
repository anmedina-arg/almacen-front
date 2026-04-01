import { useState, useCallback, useMemo } from 'react';
import type { Product } from '@/types';
import { getQuantityPerClick, calculateLineTotal } from '@/utils/productUtils';

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
      const delta = getQuantityPerClick(product);

      // Respect stock limit
      const stockLimit = product.stock_quantity;
      if (stockLimit !== undefined && stockLimit !== null && currentQty >= stockLimit) {
        return prev;
      }

      return {
        ...prev,
        [product.id]: { product, qty: currentQty + delta },
      };
    });
  }, []);

  const remove = useCallback((productId: number) => {
    setCart((prev) => {
      const current = prev[productId];
      if (!current || current.qty <= 0) return prev;
      const delta = getQuantityPerClick(current.product);
      const nextQty = current.qty - delta;
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...current, qty: nextQty } };
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const getQty = useCallback((productId: number) => cart[productId]?.qty ?? 0, [cart]);

  const entries = useMemo(() => Object.values(cart), [cart]);

  const total = useMemo(
    () => entries.reduce((sum, { product, qty }) => sum + calculateLineTotal(qty, product.sale_type, product.price), 0),
    [entries]
  );

  // Number of distinct product lines in the cart
  const itemCount = useMemo(() => entries.length, [entries]);

  return { cart, entries, add, remove, clear, getQty, total, itemCount };
}
