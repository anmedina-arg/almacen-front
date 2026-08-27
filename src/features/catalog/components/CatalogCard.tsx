'use client';

import { useCallback, useRef, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ProductSquareCard } from './ProductSquareCard';
import { SurtidoVariedadesModal } from './SurtidoVariedadesModal';
import {
  useCartItemQuantity,
  useCartStore,
  usePendingSurtidoCount,
} from '../stores/cartStore';
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
  const stagePendingSurtidoUnit = useCartStore((s) => s.stagePendingSurtidoUnit);
  const removeSurtidoUnit = useCartStore((s) => s.removeSurtidoUnit);
  const pendingCount = usePendingSurtidoCount(product.id);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ref trick: keeps the latest product reference without being a useCallback dependency.
  // Prevents onAdd/onRemove from being recreated when the parent re-renders with a new
  // product object reference (same data, different identity — e.g. after infinite scroll).
  const productRef = useRef(product);
  productRef.current = product;

  const isSurtido = product.is_producto_surtido === true;

  const onAdd = useCallback(
    () =>
      isSurtido
        ? stagePendingSurtidoUnit(productRef.current)
        : addToCart(productRef.current),
    [addToCart, isSurtido, stagePendingSurtidoUnit]
  );
  const onRemove = useCallback(
    () =>
      isSurtido
        ? removeSurtidoUnit(productRef.current)
        : removeFromCart(productRef.current),
    [isSurtido, removeFromCart, removeSurtidoUnit]
  );

  const card =
    view === 'grid' ? (
      <ProductSquareCard
        product={product}
        quantity={quantity}
        onAdd={onAdd}
        onRemove={onRemove}
        priority={priority}
      />
    ) : (
      <ProductCard
        product={product}
        quantity={quantity}
        onAdd={onAdd}
        onRemove={onRemove}
        priority={priority}
      />
    );

  if (!isSurtido) return card;

  return (
    <div className={view === 'grid' ? '' : 'w-full'}>
      {card}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={pendingCount === 0}
        className="mt-1 w-full text-xs font-medium text-center py-1.5 rounded border border-green-500 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-50"
      >
        Elegir sabores{pendingCount > 0 ? ` (${pendingCount})` : ''}
      </button>
      <SurtidoVariedadesModal
        isOpen={isModalOpen}
        product={product}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
