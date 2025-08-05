import { products } from "./mockdata";
import { Product } from "@/types";
import ProductListContainer from "@/components/ProductListContainer";
//import InfoBanner from "@/components/InfoBanner";
import Footer from "@/components/Footer";

/**
 * Componente principal de la página (SSR)
 */
export default function Home() {
  // Filtrar productos activos
  const activeProducts: Product[] = products.filter((product) => product.active);

  // Obtener todas las categorías únicas (ignorando vacías)
  const categories = Array.from(
    new Set(activeProducts.map((p) => p.categories).filter((cat) => cat))
  );

  return (
    <div className="font-sans flex flex-col min-h-screen">

      <div className="text-center mb-6 pt-8">
        <h1 className="text-2xl font-bold mb-2">Lista de precios y productos</h1>
        <p className="text-sm max-w-md mx-auto">
          Selecciona los productos que quieres pedir y luego envía tu pedido por WhatsApp
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 sm:p-2 ">

        {/* Lista de productos con lógica del carrito */}
        <ProductListContainer
          products={activeProducts}
          categories={categories}
        />
      </div>

      <Footer />
    </div>
  );
}
