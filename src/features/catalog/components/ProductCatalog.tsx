'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { Product, CategoryWithSubsPublic } from '../types';
import { ProductSearchController } from './ProductSearchController';

const InfoBanner = dynamic(
  () => import('./InfoBanner').then((m) => ({ default: m.InfoBanner })),
  { ssr: false }
);

const OrderFlowController = dynamic(
  () => import('./OrderFlowController').then((m) => ({ default: m.OrderFlowController })),
  { ssr: false }
);

interface ProductCatalogProps {
  initialProducts: Product[];
  categories: CategoryWithSubsPublic[];
}

export function ProductCatalog({ initialProducts, categories }: ProductCatalogProps) {
  const orderedCategories = useMemo(() => categories.map((c) => c.name), [categories]);
  const orderedCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  return (
    <>
      <InfoBanner />
      <ProductSearchController
        initialProducts={initialProducts}
        orderedCategories={orderedCategories}
        orderedCategoryIds={orderedCategoryIds}
      />
      <OrderFlowController />
    </>
  );
}

export default ProductCatalog;
