import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdminPanelLink } from '@/components/AdminPanelLink';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import ProductListContainer from '@/features/catalog/components/ProductListContainer';

export default function Home() {
  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <Header />
      <AdminPanelLink />
      <CategoryNav />
      <ProductListContainer />
      <Footer />
    </div>
  );
}
