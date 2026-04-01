import { fetchPublicProducts } from '../services/fetchPublicProducts';
import { fetchCategoriesWithSubs } from '../services/fetchCategoriesWithSubs';
import { ProductCatalog } from './ProductCatalog';

export async function ProductCatalogLoader() {
  const categories = await fetchCategoriesWithSubs();

  const firstCategoryId = categories[0]?.id;
  const initialProducts = firstCategoryId
    ? await fetchPublicProducts({ categoryId: firstCategoryId })
    : [];

  return (
    <ProductCatalog
      initialProducts={initialProducts}
      categories={categories}
    />
  );
}
