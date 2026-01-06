import Link from "next/link";

const FilterButtons: React.FC = () => {

	return (
		<div className="flex gap-2 py-1 relative overflow-x-auto">
			<Chips to="#Pizzas" label="Pizzas" icons="🍕" />
			<Chips to="#Fiambres" label="Fiambrería" icons="🧀" />
			<Chips to="#Panaderia" label="Panadería" icons="🍞" />
			<Chips to="#Congelados" label="Congelados" icons="🍗" />
			<Chips to="#Combos" label="Combos" icons="🍔" />
			<Chips to="#Snaks" label="Snaks" icons="🍟" />
			<Chips to="#Bebidas" label="Bebidas" icons="🍹" />
			<Chips to="#Lacteos" label="Lácteos" icons="🐮" />
			<Chips to="#Almacen" label="Almacén" icons="🛒" />
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