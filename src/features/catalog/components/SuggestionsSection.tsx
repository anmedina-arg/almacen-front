'use client';

import { useRecommendations } from '../hooks/useRecommendations';
import { useCartStore } from '../stores/cartStore';
import { SuggestionCard } from './SuggestionCard';
import type { RecommendedProduct } from '../types/recommendation.types';

interface SuggestionsSectionProps {
  cartProductIds: number[];
}

export function SuggestionsSection({ cartProductIds }: SuggestionsSectionProps) {
  const addSuggestedItem = useCartStore((s) => s.addSuggestedItem);

  const { data: recommendations, isLoading } = useRecommendations(
    cartProductIds,
    cartProductIds, // exclude items already in cart
    3
  );

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">Cargando sugerencias...</p>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  const handleAdd = (product: RecommendedProduct) => {
    addSuggestedItem(product);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-600 mb-3">
        ¿Querés agregar algo más?
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recommendations.map((product) => (
          <SuggestionCard key={product.id} product={product} onAdd={handleAdd} />
        ))}
      </div>
    </div>
  );
}
