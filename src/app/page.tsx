'use client'
import Image from "next/image";
import { products } from "./mockdata";

export default function Home() {
  // Filtrar productos activos
  const activeProducts = products.filter((product) => product.active);

  // Obtener todas las categorías únicas (ignorando vacías)
  const categories = Array.from(
    new Set(activeProducts.map((p) => p.categories).filter((cat) => cat))
  );

  // Función para abrir WhatsApp
  const openWhatsApp = () => {
    const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491112345678';
    const message = encodeURIComponent('Hola! Quiero hacerte un pedido');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

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
            <Image
              src={product.image}
              alt={product.name}
              width={100}
              height={100}
              className="object-cover rounded-lg"
            />
            <div className="flex w-full items-center justify-between">
              <h2 className="text-sm font-bold">{product.name}</h2>
              <p className="text-sm text-white">${product.price}</p>
            </div>
          </div>
        ))}

        {/* Botón flotante de WhatsApp */}
        <button
          onClick={openWhatsApp}
          className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 z-50"
          aria-label="Contactar por WhatsApp"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
          </svg>
        </button>
      </div>
    );
  }

  // Si hay categorías, agrupar y mostrar por categoría
  return (
    <div className="font-sans flex flex-col items-center justify-center p-4 gap-8 sm:p-2">
      {title}
      {categories.map((category) => (
        <div key={category} className="w-full">
          <h3 className="text-lg font-bold mb-2">{category}</h3>
          <div className="flex flex-col gap-2">
            {activeProducts
              .filter((product) => product.categories === category)
              .map((product) => (
                <div key={product.name} className="flex w-full items-center px-2">
                  {/* <Image
                    src={product.image}
                    alt={product.name}
                    width={100}
                    height={100}
                    className="object-cover rounded-lg"
                  /> */}
                  <div className="flex w-full items-center justify-between">
                    <h2 className="text-sm font-light">{product.name}</h2>
                    <p className="text-sm">${product.price}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Botón flotante de WhatsApp */}
      <button
        onClick={openWhatsApp}
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 z-50"
        aria-label="Contactar por WhatsApp"
      >
        <svg
          className="w-6 h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
        </svg>
      </button>
    </div>
  );
}
