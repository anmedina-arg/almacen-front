import { fetchPublicProducts } from '../services/fetchPublicProducts';
import { fetchCategoriesWithSubs } from '../services/fetchCategoriesWithSubs';
import { ProductCatalog } from './ProductCatalog';

export async function ProductCatalogLoader() {
  const [categories, initialProducts] = await Promise.all([
    fetchCategoriesWithSubs(),
    fetchPublicProducts(),
  ]);

  return (
    <ProductCatalog
      initialProducts={initialProducts}
      categories={categories}
    />
  );
}
