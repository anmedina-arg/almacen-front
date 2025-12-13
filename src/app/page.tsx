import ProductListContainer from "@/components/ProductListContainer";
import Footer from "@/components/Footer";
import FilterButtons from "@/components/FilterButtons";
import Header from "@/components/Header";

export default function Home() {



  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">

      <Header />

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
