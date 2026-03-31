import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdminPanelLinkLazy } from '@/components/AdminPanelLinkLazy';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import { ProductCatalog } from '@/features/catalog/components/ProductCatalog';
import { fetchPublicProducts } from '@/features/catalog/services/fetchPublicProducts';
import { fetchCategoriesWithSubs } from '@/features/catalog/services/fetchCategoriesWithSubs';

export default async function Home() {
  // fetchCategoriesWithSubs uses React cache() — CategoryNav calls it too,
  // so both share a single Supabase query per request.
  const categories = await fetchCategoriesWithSubs();

  // Fetch only the first category's products for SSR.
  // Subsequent categories are lazy-loaded client-side as the user scrolls.
  const firstCategoryId = categories[0]?.id;
  const initialProducts = firstCategoryId
    ? await fetchPublicProducts({ categoryId: firstCategoryId })
    : [];

  const orderedCategories = categories.map((c) => c.name);
  const orderedCategoryIds = categories.map((c) => c.id);

  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <Header />
      <AdminPanelLinkLazy />
      <CategoryNav />
      <ProductCatalog
        initialProducts={initialProducts}
        orderedCategories={orderedCategories}
        orderedCategoryIds={orderedCategoryIds}
      />
      <Footer />
    </div>
  );
}
