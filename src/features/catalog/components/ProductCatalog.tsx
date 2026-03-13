'use client';

import { useCallback, useMemo } from 'react';
import type { Product } from '../types';
import { useCart } from '../hooks/useCart';
import { useProductSearch } from '../hooks/useProductSearch';
import { useOrderSubmit } from '../hooks/useOrderSubmit';
import { useProducts } from '@/hooks/useProducts';
import { ProductList } from './ProductList';
import { WhatsAppButton } from './WhatsAppButton';
import { ConfirmationModal } from './ConfirmationModal';
import { InfoBanner } from './InfoBanner';

interface ProductCatalogProps {
  initialProducts: Product[];
  orderedCategories: string[];
}

export function ProductCatalog({ initialProducts, orderedCategories }: ProductCatalogProps) {
  const { data: products = initialProducts } = useProducts({ initialData: initialProducts });
  const { state, addToCart, removeFromCart, clearCart } = useCart();

  const { search, setSearch, filteredProducts, displayCategories, debouncedSearch } =
    useProductSearch(products, orderedCategories);

  const { showConfirmation, whatsAppMessage, handleSendMessage, handleConfirmOrder, handleCancelOrder } =
    useOrderSubmit(state.items);

  const productsById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const onAdd = useCallback(
    (id: number) => {
      const product = productsById.get(id);
      if (product) addToCart(product);
    },
    [addToCart, productsById],
  );

  const onRemove = useCallback(
    (id: number) => {
      const product = productsById.get(id);
      if (product) removeFromCart(product);
    },
    [removeFromCart, productsById],
  );

  const cartQuantities = useMemo(
    () => new Map(state.items.map((item) => [item.id, item.quantity])),
    [state.items],
  );

  return (
    <>
      {state.items.length === 0 && <InfoBanner />}

      <div className="w-full flex justify-center px-4 py-2 sticky top-52 z-30 bg-white/80 backdrop-blur-md transition-all duration-300">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre..."
          className="w-full max-w-lg bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          aria-label="Buscar productos"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="w-full max-w-xl mx-auto p-4 text-center text-sm text-gray-700 bg-orange-400 rounded-md">
          <p>
            no hemos encontrado el producto, por favor contactate con Andrés o Maria. Gracias. Andrés: +5493816713512
          </p>
        </div>
      ) : (
        <ProductList
          products={filteredProducts}
          cartQuantities={cartQuantities}
          onAdd={onAdd}
          onRemove={onRemove}
          mainCategories={displayCategories}
          searchQuery={debouncedSearch}
        />
      )}

      <WhatsAppButton
        cartItems={state.items}
        onSendMessage={handleSendMessage}
      />

      <ConfirmationModal
        isOpen={showConfirmation}
        message={whatsAppMessage}
        onConfirm={() => handleConfirmOrder(clearCart)}
        onCancel={handleCancelOrder}
      />
    </>
  );
}

export default ProductCatalog;
