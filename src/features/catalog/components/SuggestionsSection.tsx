'use client';

import { useRecommendations } from '../hooks/useRecommendations';
import { useCartStore } from '../stores/cartStore';
import { SuggestionCard } from './SuggestionCard';
import type { RecommendedProduct } from '../types/recommendation.types';

interface SuggestionsSectionProps {
  cartProductIds: number[];
}

function SuggestionCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1 w-24 flex-shrink-0 animate-pulse">
      <div className="w-16 h-16 bg-gray-200 rounded-lg" />
      <div className="h-3 w-16 bg-gray-200 rounded" />
      <div className="h-3 w-10 bg-gray-200 rounded" />
      <div className="h-6 w-full bg-gray-200 rounded-md" />
    </div>
  );
}

export function SuggestionsSection({ cartProductIds }: SuggestionsSectionProps) {
  const addSuggestedItem = useCartStore((s) => s.addSuggestedItem);

  const { data: recommendations, isLoading } = useRecommendations(
    cartProductIds,
    cartProductIds, // exclude items already in cart
    3
  );

  const hasResults = !isLoading && !!recommendations && recommendations.length > 0;
  const isExpanded = isLoading || hasResults;

  const handleAdd = (product: RecommendedProduct) => {
    addSuggestedItem(product);
  };

  // Loading and loaded states render at the same height (a row of cards is
  // always as tall as one card, 1-3 of them, since they lay out horizontally)
  // so that transition is a zero-jump swap. The remaining case — loading
  // collapsing straight to "no suggestions" — genuinely loses height, so
  // that one is animated instead via the grid-rows collapse trick, to avoid
  // the Confirm button jumping under the user's finger.
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-3">
            ¿Querés agregar algo más?
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <SuggestionCardSkeleton key={i} />)
              : recommendations?.map((product) => (
                  <SuggestionCard key={product.id} product={product} onAdd={handleAdd} />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
