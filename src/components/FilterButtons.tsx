import Link from "next/link";

const FilterButtons: React.FC = () => {

	return (
		<div className="flex gap-2 py-1 relative overflow-x-auto">
			<Chips to="#Fiambres" label="Fiambrería" icons="🧀" />
			<Chips to="#Panaderia" label="Panadería" icons="🍞" />
			<Chips to="#Congelados" label="Congelados" icons="🍗" />
			<Chips to="#Combos" label="Combos" icons="🍔" />
			<Chips to="#Snaks" label="Snaks" icons="🍟" />
			<Chips to="#Bebidas" label="Bebidas" icons="🍹" />
			<Chips to="#Lacteos" label="Lácteos" icons="🐮" />
			<Chips to="#Almacen" label="Almacén" icons="🛒" />
			{/* 			
			<Link href="#Fiambres" className="bg-yellow-400 font-medium text-black py-0.5 px-1 rounded-xl flex items-center justify-center gap-1">
				<span className="bg-white rounded-full p-0.25">❗</span>
				<span>Fiambrería</span>
			</Link>
			<Link href="#Panaderia" className="bg-orange-300 font-medium text-black py-0.5 px-1 rounded-xl flex items-center justify-center">
				<span>🍞</span>
				<span>Panadería</span>
			</Link>
			<Link href="#Congelados" className="bg-blue-300 font-medium text-black py-0.5 px-1 rounded-xl flex items-center justify-center">
				<span>🍗</span>
				<span>Congelados</span>
			</Link>
			<Link href="#Combos" className="bg-orange-500 font-medium text-black py-0.5 px-1 rounded-xl flex items-center justify-center">
				<span>🍔</span>
				<span>Combos</span>
			</Link>
			<Link href="#Snaks" className="bg-yellow-400 font-medium text-black py-0.5 px-1 rounded-xl flex items-center justify-center">
				<span>🍟</span>
				<span>Snaks</span>
			</Link>
			<Link href="#Bebidas" className="bg-blue-800 text-white font-medium py-0.5 px-1 rounded-xl flex items-center justify-center">
				<span>🍹</span>
				<span>Bebidas</span>
			</Link>
			<Link href="#Lacteos" className="bg-white text-black font-medium py-0.5 px-1 rounded-xl flex items-center justify-center">
				<span>🧀</span>
				<span>Lácteos</span>
			</Link>
			<Link href="#Almacen" className="bg-green-400 font-medium text-black py-0.5 px-1 rounded-xl flex items-center justify-center gap-1">
				<span className="bg-white rounded-full p-0.25">🛒</span>
				<span>Almacén</span>
			</Link> */}
		</div>
	)
};

export default FilterButtons

interface ChipsProps {
	to: string
	label: string
	icons?: string
}

const Chips: React.FC<ChipsProps> = ({ to, label, icons }) => {
	return (
		<Link href={to} className="font-medium py-0.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 w-24 shrink-0">
			<div className="bg-gray-200 w-full h-16 flex items-center justify-center rounded-xl">
				<span className=" text-3xl">{icons}</span>
			</div>
			<span>{label}</span>
		</Link>
	)
}