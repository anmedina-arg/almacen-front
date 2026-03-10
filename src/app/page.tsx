import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdminPanelLink } from '@/components/AdminPanelLink';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import { ProductCatalog } from '@/features/catalog/components/ProductCatalog';
import { fetchPublicProducts } from '@/features/catalog/services/fetchPublicProducts';

export default async function Home() {
  const initialProducts = await fetchPublicProducts();

  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <Header />
      <AdminPanelLink />
      <CategoryNav />
      <ProductCatalog initialProducts={initialProducts} />
      <Footer />
    </div>
  );
}
