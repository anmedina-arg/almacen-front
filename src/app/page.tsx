import ProductListContainer from "@/components/ProductListContainer";
import Footer from "@/components/Footer";
import FilterButtons from "@/components/FilterButtons";
import HelpButton from "@/components/HelpButton";

export default function Home() {

  return (
    <div className="font-sans flex flex-col min-h-screen px-2">

      <div className="text-center mb-6 pt-8">
        <h1 className="text-2xl font-bold mb-2">Lista de precios y productos</h1>
        <p className="text-sm max-w-md mx-auto">
          Selecciona los productos que quieres pedir y luego envía tu pedido por WhatsApp <HelpButton />
        </p>
      </div>
      <div className="sticky top-0 p-1 backdrop-blur-md bg-white/10 rounded-tl-none rounded-tr-none rounded-bl-2xl rounded-br-2xl z-50 mb-6">
        <FilterButtons />
      </div>

      <div className="flex flex-col items-center justify-center gap-8 sm:p-2 ">

        {/* Lista de productos con lógica del carrito */}
        <ProductListContainer />
      </div>

      <Footer />
    </div>
  );
}
