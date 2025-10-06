import Link from "next/link";

//TODO - los botones de filtro salen del campo visual, por lo que solo sirven para filtrar al abrir la app. Cooregir para que siempre se vean
//TODO - Los botones filtros deberian filtrar por "main category", actualmente no lo hacen asi.
const FilterButtons: React.FC = () => {

	return (
		<div className="flex justify-center gap-2 py-1 flex-wrap relative">
			<Link href="#Galletas y variedades" className="bg-orange-300 font-medium text-black p-1 rounded flex flex-col items-center justify-center" ><span>🍞</span><span>Panadería</span> </Link>
			<Link href="#Congelados" className="bg-blue-300 font-medium text-black p-1 rounded flex flex-col items-center justify-center" ><span>🍗</span><span>Congelados</span></Link>
			<Link href="#Combo Hamburguesas" className="bg-orange-500 font-medium text-black p-1 rounded flex flex-col items-center justify-center" ><span>🍔</span><span>Combos</span></Link>
			<Link href="#Snaks" className=" bg-yellow-400 font-medium text-black p-1 rounded flex flex-col items-center justify-center" ><span>🍟</span><span>Snaks</span></Link>
			<Link href="#Bebidas" className=" bg-blue-800 text-white font-medium p-1 rounded flex flex-col items-center justify-center" ><span>🍹</span><span>Bebidas</span></Link>
		</div>
	)
};

export default FilterButtons