'use client';

import Image from 'next/image';
import type { RecommendedProduct } from '../types/recommendation.types';

interface SuggestionCardProps {
  product: RecommendedProduct;
  onAdd: (product: RecommendedProduct) => void;
}

export function SuggestionCard({ product, onAdd }: SuggestionCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 w-24 flex-shrink-0">
      <div className="relative w-16 h-16">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover rounded-lg"
          sizes="64px"
        />
      </div>
      <p className="text-xs font-semibold text-gray-800 text-center leading-tight line-clamp-2">
        {product.name}
      </p>
      <p className="text-xs font-bold text-green-600">${product.price}</p>
      <button
        onClick={() => onAdd(product)}
        className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md font-medium transition-colors w-full"
      >
        + Agregar
      </button>
    </div>
  );
}
