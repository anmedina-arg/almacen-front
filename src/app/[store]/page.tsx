import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductSearchBar } from '@/features/catalog/components/ProductSearchBar';
import CategoryNav from '@/features/catalog/components/CategoryNav';
import { ProductCatalogLoader } from '@/features/catalog/components/ProductCatalogLoader';
import { ProductCatalogSkeleton } from '@/features/catalog/components/ProductCatalogSkeleton';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreBySlug } from '@/lib/store/getStoreBySlug';

export default async function Home({ params }: { params: Promise<{ store: string }> }) {
  const { store } = await params;
  const supabase = await createSupabaseServerClient();
  const storeData = await getStoreBySlug(supabase, store);

  // [store]/layout.tsx ya valida que el slug exista antes de renderizar
  // esta página — un storeData null acá sería una carrera imposible en la
  // práctica, pero notFound() es más seguro que asumirlo.
  if (storeData == null) {
    notFound();
  }
  const storeId = storeData.id;

  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      <div className="sticky top-0 z-50">
        <Header storeName={storeData.name} />
        <ProductSearchBar />
        <CategoryNav storeId={storeId} />
      </div>
      <Suspense fallback={<ProductCatalogSkeleton />}>
        <ProductCatalogLoader storeId={storeId} />
      </Suspense>
      <Footer />
    </div>
  );
}
