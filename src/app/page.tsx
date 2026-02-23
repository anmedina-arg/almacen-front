import ProductListContainer from "@/features/catalog/components/ProductListContainer";
import Footer from "@/components/Footer";
import FilterButtons from "@/features/catalog/components/FilterButtons";
import Header from "@/components/Header";
import { AdminPanelLink } from "@/components/AdminPanelLink";

export default function Home() {



  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">

      <Header />

      <AdminPanelLink />

      <div className="p-1 mt-0 sticky top-9 z-50 bg-white/80 backdrop-blur-md transition-all duration-300">
        <span className="flex justify-end w-full text-sm text-gray-700 px-4">
          más categorías 👉
        </span>
        <FilterButtons />
      </div>

      <ProductListContainer />

      <Footer />
    </div>
  );
}
