'use client'
import Image from "next/image";
import { products } from "./mockdata";
import { useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  active: boolean;
  categories: string;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unitPrice: number;
  isByWeight: boolean;
}

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filtrar productos activos
  const activeProducts = products.filter((product) => product.active);

  // Obtener todas las categorías únicas (ignorando vacías)
  const categories = Array.from(
    new Set(activeProducts.map((p) => p.categories).filter((cat) => cat))
  );

  // Función para detectar si un producto se vende por peso
  const isProductByWeight = (productName: string): boolean => {
    return productName.toLowerCase().includes('x 100 gr') ||
      productName.toLowerCase().includes('x kg');
  };

  // Función para obtener el tipo de producto por peso
  const getWeightType = (productName: string): '100gr' | 'kg' | 'unit' => {
    const name = productName.toLowerCase();

    if (name.includes('x 100 gr')) {
      return '100gr';
    } else if (name.includes('x kg')) {
      return 'kg';
    } else {
      return 'unit';
    }
  };

  // Función para obtener la cantidad a agregar por click
  const getQuantityPerClick = (productName: string): number => {
    const weightType = getWeightType(productName);

    switch (weightType) {
      case '100gr':
        return 100; // 100 gramos por click
      case 'kg':
        return 500; // 500 gramos (medio kilo) por click
      case 'unit':
        return 1; // 1 unidad por click
      default:
        return 1;
    }
  };

  // Función para obtener el precio unitario por gramo o unidad
  const getUnitPrice = (product: Product): number => {
    const weightType = getWeightType(product.name);

    switch (weightType) {
      case '100gr':
        return product.price; // Precio por 100gr
      case 'kg':
        return product.price; // Precio por kg
      case 'unit':
        return product.price; // Precio por unidad
      default:
        return product.price;
    }
  };

  // Función para calcular el precio total de un item
  const calculateItemPrice = (item: CartItem): number => {
    const weightType = getWeightType(item.name);

    switch (weightType) {
      case '100gr':
        // Para productos por 100gr: (cantidad en gr / 100) * precio por 100gr
        return (item.quantity / 100) * item.unitPrice;
      case 'kg':
        // Para productos por kg: (cantidad en gr / 1000) * precio por kg
        return (item.quantity / 1000) * item.unitPrice;
      case 'unit':
        // Para productos por unidad: cantidad * precio unitario
        return item.quantity * item.unitPrice;
      default:
        return item.quantity * item.unitPrice;
    }
  };

  // Función para agregar producto al carrito
  const addToCart = (product: Product) => {
    const isByWeight = isProductByWeight(product.name);
    const quantity = getQuantityPerClick(product.name); // Cantidad dinámica según el tipo

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);

      if (existingItem) {
        // Si ya existe, aumentar cantidad
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Si no existe, agregar nuevo item
        return [...prevCart, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          unitPrice: getUnitPrice(product),
          isByWeight: isByWeight
        }];
      }
    });
  };

  // Función para quitar producto del carrito
  const removeFromCart = (product: Product) => {
    const isByWeight = isProductByWeight(product.name);
    const quantity = getQuantityPerClick(product.name); // Cantidad dinámica según el tipo

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);

      if (existingItem) {
        if (existingItem.quantity <= quantity) {
          // Si la cantidad es menor o igual, eliminar el item
          return prevCart.filter(item => item.id !== product.id);
        } else {
          // Si hay más cantidad, reducir
          return prevCart.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity - quantity }
              : item
          );
        }
      }
      return prevCart;
    });
  };

  // Función para obtener cantidad de un producto en el carrito
  const getCartQuantity = (productId: number): number => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  // Función para truncar texto según el ancho de pantalla
  const truncateProductName = (name: string, maxLength: number): string => {
    if (name.length <= maxLength) return name;

    // Remover sufijos comunes primero
    const cleanName = name
      .replace(' x 100 gr', '')
      .replace(' x Kg', '')
      .replace(' x kg', '')
      .replace(' x 4 u.', '')
      .replace(' x 6 u.', '')
      .replace(' x 12 u.', '')
      .replace(' (pack)', '');

    if (cleanName.length <= maxLength) return cleanName;

    // Si aún es muy largo, truncar
    return cleanName.substring(0, maxLength - 3) + '...';
  };

  // Función para generar el mensaje de WhatsApp con formato optimizado
  const generateWhatsAppMessage = (): string => {
    if (cart.length === 0) {
      return 'Hola! Quiero hacerte un pedido';
    }

    // Detectar ancho de pantalla para ajustar el formato
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const maxProductLength = isMobile ? 20 : 30; // Menos caracteres en móvil

    let message = 'Hola! Quiero hacerte un pedido de:\n\n';
    let total = 0;

    cart.forEach(item => {
      const itemTotal = calculateItemPrice(item);
      total += itemTotal;

      const weightType = getWeightType(item.name);
      let quantityText = '';

      if (weightType === '100gr') {
        quantityText = `${item.quantity}gr`;
      } else if (weightType === 'kg') {
        if (item.quantity >= 1000) {
          quantityText = `${item.quantity / 1000}kg`;
        } else {
          quantityText = `${item.quantity}gr`;
        }
      } else {
        quantityText = `${item.quantity}`;
      }

      // Truncar nombre del producto
      const productName = truncateProductName(item.name, maxProductLength);

      // Formatear línea con alineación
      const quantityPadded = quantityText.padEnd(8); // Espacio fijo para cantidad
      const pricePadded = `$${itemTotal}`.padStart(8); // Espacio fijo para precio

      message += `${quantityPadded} ${productName} ${pricePadded}\n`;
    });

    message += `\nTotal = $${total}`;
    return message;
  };

  // Función para abrir WhatsApp con confirmación
  const openWhatsApp = () => {
    if (cart.length === 0) {
      // Si no hay productos, enviar mensaje simple
      const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491112345678';
      const message = encodeURIComponent('Hola! Quiero hacerte un pedido');
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    } else {
      // Si hay productos, mostrar confirmación
      setShowConfirmation(true);
    }
  };

  // Función para confirmar y enviar pedido
  const confirmAndSendOrder = () => {
    const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491112345678';
    const message = encodeURIComponent(generateWhatsAppMessage());
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setShowConfirmation(false);
  };

  // Función para cancelar confirmación
  const cancelOrder = () => {
    setShowConfirmation(false);
  };

  // Función para limpiar carrito
  const clearCart = () => {
    setCart([]);
  };

  // Título principal
  const title = (
    <h1 className="text-2xl font-bold mb-6 text-center">Lista de precios y productos</h1>
  );

  // Footer component
  const Footer = () => (
    <footer className="bg-gray-100 border-t border-gray-200 mt-12 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-2">
            Desarrollado por{' '}
            <span className="font-semibold text-gray-800">Andrés Medina</span>
          </p>
          <p className="text-gray-500 text-xs">
            Contacto: {' '}
            <a
              href="mailto:andres.medina.arg@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              andres.medina.arg@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );

  // Componente de producto con botones
  const ProductItem = ({ product }: { product: Product }) => {
    const quantity = getCartQuantity(product.id);
    const isByWeight = isProductByWeight(product.name);
    const weightType = getWeightType(product.name);

    // Función para formatear la cantidad mostrada
    const formatQuantity = (qty: number, type: string) => {
      if (type === 'kg') {
        if (qty >= 1000) {
          return `${qty / 1000}kg`;
        } else {
          return `${qty}gr`;
        }
      } else if (type === '100gr') {
        return `${qty}gr`;
      } else {
        return qty.toString();
      }
    };

    return (
      <div className="flex w-full items-center justify-between border-solid border-2 border-gray-300 rounded-lg p-2">
        <div className="flex items-center gap-3 flex-1">
          {/* <Image
            src={product.image}
            alt={product.name}
            width={60}
            height={60}
            className="object-cover rounded-lg"
          /> */}
          <div className="flex-1">
            <h2 className="text-sm font-bold">{product.name}</h2>
            <p className="text-sm text-gray-600">${product.price}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quantity > 0 && (
            <span className="text-sm font-semibold text-green-600 min-w-[40px] text-center">
              {formatQuantity(quantity, weightType)}
            </span>
          )}

          <button
            onClick={() => removeFromCart(product)}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold transition-colors"
            disabled={quantity === 0}
          >
            -
          </button>

          <button
            onClick={() => addToCart(product)}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  // Si no hay categorías, mostrar todos los productos activos sin agrupar
  if (categories.length === 0) {
    return (
      <div className="font-sans flex flex-col min-h-screen">
        <div className="flex flex-col items-center justify-center p-8 gap-4 sm:p-2 flex-1">
          {title}
          {activeProducts.map((product) => (
            <ProductItem key={product.name} product={product} />
          ))}
        </div>

        <Footer />

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

        {/* Popup de confirmación */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Vas a enviar el siguiente mensaje con tu pedido:</h3>
              <div className="mb-4">
                <div className="bg-gray-50 p-4 rounded text-sm border-l-4 border-green-500">
                  <div className="whitespace-pre-line text-gray-800">
                    {generateWhatsAppMessage()}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 text-center">¿Lo envías?</p>
              <div className="flex gap-3">
                <button
                  onClick={cancelOrder}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition-colors font-medium"
                >
                  Modificar
                </button>
                <button
                  onClick={confirmAndSendOrder}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors font-medium"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Si hay categorías, agrupar y mostrar por categoría
  return (
    <div className="font-sans flex flex-col min-h-screen">
      <div className="flex flex-col items-center justify-center p-4 gap-8 sm:p-2 flex-1">
        {title}
        {categories.map((category) => (
          <div key={category} className="w-full">
            <h3 className="text-lg font-bold mb-2">{category}</h3>
            <div className="flex flex-col gap-2">
              {activeProducts
                .filter((product) => product.categories === category)
                .map((product) => (
                  <ProductItem key={product.name} product={product} />
                ))}
            </div>
          </div>
        ))}
      </div>

      <Footer />

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

      {/* Popup de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Vas a enviar el siguiente mensaje con tu pedido:</h3>
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded text-sm border-l-4 border-green-500">
                <div className="whitespace-pre-line text-gray-800">
                  {generateWhatsAppMessage()}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center">¿Lo envías?</p>
            <div className="flex gap-3">
              <button
                onClick={cancelOrder}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition-colors font-medium"
              >
                Modificar
              </button>
              <button
                onClick={confirmAndSendOrder}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
