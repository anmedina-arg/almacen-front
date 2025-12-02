'use client';

import { useState, useEffect } from "react";
import ProductListContainer from "@/components/ProductListContainer";
import Footer from "@/components/Footer";
import FilterButtons from "@/components/FilterButtons";
import HelpButton from "@/components/HelpButton";
import Image from "next/image";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="font-barlow flex flex-col min-h-screen px-2">
      {/* Header inicial (completo) */}
      <div
        className={`text-center justify-center items-center flex gap-2 transition-all duration-300 ${isScrolled ? "opacity-0 h-0 p-0" : "mb-4 mt-2 py-2"
          }`}
      >
        <Image
          src="https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png"
          alt="Market del cevil Logo"
          width={128}
          height={128}
          className="rounded-2xl"
        />
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold">Market del Cevil</h1>
          <p className="text-sm max-w-md mx-auto text-balance">
            Selecciona los productos que quieres pedir y luego envía tu pedido por
            WhatsApp <HelpButton />
          </p>
        </div>
      </div>
      <div className="p-1 border-t border-gray-700 mt-2">
        <span className="flex justify-end w-full text-sm text-gray-300 px-4">
          más categorías 👉
        </span>
        <FilterButtons />
      </div>

      {/* Header sticky (reducido) */}
      <div
        className={`sticky top-0 z-50 bg-black/80 backdrop-blur-md transition-all duration-300 ${isScrolled ? "py-2" : "opacity-0 h-0 p-0 pointer-events-none"
          }`}
      >
        <div className="flex items-center gap-2 px-2">
          <Image
            src="https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png"
            alt="Market del cevil Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <h1 className="text-lg font-bold">Market del Cevil</h1>
        </div>

        {/* FilterButtons */}
        <div className="p-1 border-t border-gray-700 mt-2">
          <span className="flex justify-end w-full text-sm text-gray-300 px-4">
            más categorías 👉
          </span>
          <FilterButtons />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 sm:p-2">
        {/* Lista de productos con lógica del carrito */}
        <ProductListContainer />
      </div>

      <Footer />
    </div>
  );
}
