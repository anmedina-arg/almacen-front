import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductSearchBar } from '@/features/catalog/components/ProductSearchBar';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import { ProductCatalogLoader } from '@/features/catalog/components/ProductCatalogLoader';
import { ProductCatalogSkeleton } from '@/features/catalog/components/ProductCatalogSkeleton';

export default function Home() {
  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <div className="sticky top-0 z-50">
        <Header />
        <ProductSearchBar />
        <CategoryNav />
      </div>
      <Suspense fallback={<ProductCatalogSkeleton />}>
        <ProductCatalogLoader />
      </Suspense>
      <Footer />
    </div>
  );
}
