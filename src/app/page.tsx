'use client';
import { products } from "./mockdata";
import { Product } from "@/types";
import ProductListContainer from "@/components/ProductListContainer";
import Footer from "@/components/Footer";
import { useState } from "react";

export default function Home() {
  const [filterType, setFilterType] = useState<'panaderia' | 'congelados' | 'combos' | undefined>(undefined);

  // Filtrar productos activos
  const activeProducts: Product[] = products.filter((product) => product.active);

  // filtra productos por tipo
  const filteredProducts = activeProducts.filter(p => {
    if (!filterType) return true;
    return p.mainCategory === filterType;
  });

  // Obtener todas las categorías únicas (ignorando vacías)
  const categories = Array.from(
    new Set(filteredProducts.map((p) => p.categories).filter((cat) => cat))
  );

  return (
    <div className="font-sans flex flex-col min-h-screen px-2">

      <div className="text-center mb-6 pt-8">
        <h1 className="text-2xl font-bold mb-2">Lista de precios y productos</h1>
        <p className="text-sm max-w-md mx-auto">
          Selecciona los productos que quieres pedir y luego envía tu pedido por WhatsApp
        </p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        <button className="bg-orange-300 font-medium text-black p-1 rounded" onClick={() => setFilterType('panaderia')}>🍞 Panadería</button>
        <button className="bg-blue-300 font-medium text-black p-1 rounded" onClick={() => setFilterType('congelados')}>🍗 Congelados</button>
        <button className="bg-yellow-400 font-medium text-black p-1 rounded" onClick={() => setFilterType('combos')}>🍔 Combos</button>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 sm:p-2 ">

        {/* Lista de productos con lógica del carrito */}
        <ProductListContainer
          products={filteredProducts}
          categories={categories}
        />
      </div>

      <Footer />
    </div>
  );
}
