'use client';

import dynamic from 'next/dynamic';
import type { Product } from '../types';
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
  orderedCategories: string[];
  orderedCategoryIds: number[];
}

export function ProductCatalog({ initialProducts, orderedCategories, orderedCategoryIds }: ProductCatalogProps) {
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
