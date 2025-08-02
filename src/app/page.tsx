import Image from "next/image";
import { products } from "./mockdata";
export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      {products.map((product) => (
        <div key={product.name} className="flex w-full items-center border-solid border-2 border-gray-300 rounded-lg p-2">
          {/* <Image
            src={product.image}
            alt={product.name}
            width={192}
            height={192}
            className="w-48 h-48 object-cover mb-4"
          /> */}
          <div className="flex w-full items-center justify-between mx-4">
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-lg text-gray-700">${product.price.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
