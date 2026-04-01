import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdminPanelLinkLazy } from '@/components/AdminPanelLinkLazy';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import { ProductCatalogLoader } from '@/features/catalog/components/ProductCatalogLoader';
import { ProductCatalogSkeleton } from '@/features/catalog/components/ProductCatalogSkeleton';

export default function Home() {
  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <Header />
      <AdminPanelLinkLazy />
      <CategoryNav />
      <Suspense fallback={<ProductCatalogSkeleton />}>
        <ProductCatalogLoader />
      </Suspense>
      <Footer />
    </div>
  );
}
