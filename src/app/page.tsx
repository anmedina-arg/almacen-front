import Image from "next/image";
import { products } from "./mockdata";

export default function Home() {
  // Filtrar productos activos
  const activeProducts = products.filter((product) => product.active);

  // Obtener todas las categorías únicas (ignorando vacías)
  const categories = Array.from(
    new Set(activeProducts.map((p) => p.categories).filter((cat) => cat))
  );

  // Título principal
  const title = (
    <h1 className="text-2xl font-bold mb-6 text-center">Lista de precios y productos</h1>
  );

  // Si no hay categorías, mostrar todos los productos activos sin agrupar
  if (categories.length === 0) {
    return (
      <div className="font-sans flex flex-col items-center justify-center p-8 gap-4 sm:p-2">
        {title}
        {activeProducts.map((product) => (
          <div key={product.name} className="flex w-full items-center border-solid border-2 border-gray-300 rounded-lg p-2">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-sm font-bold">{product.name}</h2>
              <p className="text-sm text-white">${product.price}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Si hay categorías, agrupar y mostrar por categoría
  return (
    <div className="font-sans flex flex-col items-center justify-center p-8 gap-8 sm:p-2">
      {title}
      {categories.map((category) => (
        <div key={category} className="w-full">
          <h3 className="text-lg font-bold mb-2">{category}</h3>
          <div className="flex flex-col gap-2">
            {activeProducts
              .filter((product) => product.categories === category)
              .map((product) => (
                <div key={product.name} className="flex w-full items-center p-2">
                  <div className="flex w-full items-center justify-between">
                    <h2 className="text-sm font-bold">{product.name}</h2>
                    <p className="text-sm text-white">${product.price}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
