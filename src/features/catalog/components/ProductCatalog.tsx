'use client';

import dynamic from 'next/dynamic';
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
  whatsappNumber: string;
}

export function ProductCatalog({ initialProducts, categories, whatsappNumber }: ProductCatalogProps) {
  return (
    <>
      <InfoBanner />
      <ProductSearchController
        initialProducts={initialProducts}
        categories={categories}
      />
      <OrderFlowController whatsappNumber={whatsappNumber} />
    </>
  );
}

export default ProductCatalog;
