'use client';

import { useCallback } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ProductSquareCard } from './ProductSquareCard';
import { useCartItemQuantity, useCartStore } from '../stores/cartStore';
import type { Product } from '../types';

interface CatalogCardProps {
  product: Product;
  view: 'list' | 'grid';
  priority?: boolean;
}

export function CatalogCard({ product, view, priority = false }: CatalogCardProps) {
  const quantity = useCartItemQuantity(product.id);
  const addToCart = useCartStore((s) => s.addToCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  const onAdd = useCallback(() => addToCart(product), [addToCart, product]);
  const onRemove = useCallback(() => removeFromCart(product), [removeFromCart, product]);

  if (view === 'grid') {
    return (
      <ProductSquareCard
        product={product}
        quantity={quantity}
        onAdd={onAdd}
        onRemove={onRemove}
        priority={priority}
      />
    );
  }

  return (
    <ProductCard
      product={product}
      quantity={quantity}
      onAdd={onAdd}
      onRemove={onRemove}
      priority={priority}
    />
  );
}
