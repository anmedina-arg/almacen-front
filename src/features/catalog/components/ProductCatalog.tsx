import type { Product } from '../types';
import { InfoBanner } from './InfoBanner';
import { ProductSearchController } from './ProductSearchController';
import { OrderFlowController } from './OrderFlowController';

interface ProductCatalogProps {
  initialProducts: Product[];
  orderedCategories: string[];
}

export function ProductCatalog({ initialProducts, orderedCategories }: ProductCatalogProps) {
  return (
    <>
      <InfoBanner />
      <ProductSearchController
        initialProducts={initialProducts}
        orderedCategories={orderedCategories}
      />
      <OrderFlowController />
    </>
  );
}

export default ProductCatalog;
