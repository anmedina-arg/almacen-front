import { fetchPublicProducts } from '../services/fetchPublicProducts';
import { fetchCategoriesWithSubs } from '../services/fetchCategoriesWithSubs';
import { ProductCatalog } from './ProductCatalog';

export async function ProductCatalogLoader({ storeId }: { storeId: number }) {
  const [categories, initialProducts] = await Promise.all([
    fetchCategoriesWithSubs(storeId),
    fetchPublicProducts(storeId),
  ]);

  return (
    <ProductCatalog
      initialProducts={initialProducts}
      categories={categories}
    />
  );
}
