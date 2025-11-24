import Link from "next/link";

//TODO - Los botones filtros deberian filtrar por "main category", actualmente no lo hacen asi.
const FilterButtons: React.FC = () => {

	return (
		<div className="flex justify-center gap-2 py-1 flex-wrap relative">
			<Link href="#Galletas y variedades" className="bg-orange-300 font-medium text-black py-0.5 px-1  rounded-xl flex items-center justify-center" ><span>🍞</span><span>Panadería</span> </Link>
			<Link href="#Congelados" className="bg-blue-300 font-medium text-black py-0.5 px-1  rounded-xl flex items-center justify-center" ><span>🍗</span><span>Congelados</span></Link>
			<Link href="#Combo Hamburguesas" className="bg-orange-500 font-medium text-black py-0.5 px-1  rounded-xl flex items-center justify-center" ><span>🍔</span><span>Combos</span></Link>
			<Link href="#Snaks" className=" bg-yellow-400 font-medium text-black py-0.5 px-1  rounded-xl flex items-center justify-center" ><span>🍟</span><span>Snaks</span></Link>
			<Link href="#Bebidas" className=" bg-blue-800 text-white font-medium py-0.5 px-1  rounded-xl flex items-center justify-center" ><span>🍹</span><span>Bebidas</span></Link>
			<Link href="#Lácteos" className=" bg-white text-black font-medium py-0.5 px-1  rounded-xl flex items-center justify-center" ><span>🧀</span><span>Lácteos</span></Link>
			<Link href="#Almacén" className=" bg-green-400 font-medium text-black py-0.5 px-1  rounded-xl flex items-center justify-center gap-1" ><span className="bg-white rounded-full p-0.25 ">🛒</span><span>Almacén</span></Link>
		</div>
	)
};

export default FilterButtons