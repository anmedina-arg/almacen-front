import ProductListContainer from "@/components/ProductListContainer";
import Footer from "@/components/Footer";
import FilterButtons from "@/components/FilterButtons";
import HelpButton from "@/components/HelpButton";
import Image from "next/image";

export default function Home() {

  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">

      <div className="text-center mb-4 mt-2 justify-center items-center flex flex-col gap-2">
        <div className="flex items-center gap-2 ">
          <Image src="https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png" alt="Market del cevil Logo" width={64} height={64} className="rounded-full" />
          <h1 className="text-2xl font-bold">Market del Cevil</h1>
        </div>
        <p className="text-sm max-w-md mx-auto text-balance">
          Selecciona los productos que quieres pedir y luego envía tu pedido por WhatsApp <HelpButton />
        </p>
      </div>
      <div className="sticky top-0 p-1 backdrop-blur-md bg-white/10 rounded-tl-none rounded-tr-none rounded-bl-2xl rounded-br-2xl z-50">
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
