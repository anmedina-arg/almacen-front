import type { Product } from '../types';
import { InfoBanner } from './InfoBanner';
import { ProductSearchController } from './ProductSearchController';
import { OrderFlowController } from './OrderFlowController';

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
