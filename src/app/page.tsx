import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdminPanelLink } from '@/components/AdminPanelLink';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import { ProductCatalog } from '@/features/catalog/components/ProductCatalog';
import { fetchPublicProducts } from '@/features/catalog/services/fetchPublicProducts';
import { fetchCategoriesWithSubs } from '@/features/catalog/services/fetchCategoriesWithSubs';

export default async function Home() {
  // fetchCategoriesWithSubs uses React cache() — CategoryNav calls it too,
  // so both share a single Supabase query per request.
  const [initialProducts, categories] = await Promise.all([
    fetchPublicProducts(),
    fetchCategoriesWithSubs(),
  ]);

  const orderedCategories = categories.map((c) => c.name);

  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <Header />
      <AdminPanelLink />
      <CategoryNav />
      <ProductCatalog initialProducts={initialProducts} orderedCategories={orderedCategories} />
      <Footer />
    </div>
  );
}
