'use client';

import { useCallback, useRef } from 'react';
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

  // Ref trick: keeps the latest product reference without being a useCallback dependency.
  // Prevents onAdd/onRemove from being recreated when the parent re-renders with a new
  // product object reference (same data, different identity — e.g. after infinite scroll).
  const productRef = useRef(product);
  productRef.current = product;

  const onAdd = useCallback(() => addToCart(productRef.current), [addToCart]);
  const onRemove = useCallback(() => removeFromCart(productRef.current), [removeFromCart]);

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
