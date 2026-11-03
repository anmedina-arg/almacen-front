import HelpButton from './HelpButton';

const linkClass = 'inline-flex min-h-11 items-center font-semibold text-action-green underline';

interface FooterProps {
	/** Demo Store (#153): el pie ofrece contratar el sistema. */
	isDemo: boolean;
	storeName: string;
}

/**
 * Pie del catálogo (#174). En la Demo Store muestra el crédito del desarrollador
 * y la invitación a contratar el sistema; en una tienda real es mínimo, sin
 * datos del desarrollador. Reserva espacio abajo (pb-32) para que la barra de
 * pedido fija no lo tape.
 */
export function Footer({ isDemo, storeName }: FooterProps) {
	return (
		<footer className="bg-gray-50 border-t border-gray-200 mt-12 pb-32">
			<div className="max-w-4xl mx-auto px-4 py-6 text-center text-[13px] text-gray-500">
				{isDemo ? <DemoFooterContent /> : <StoreFooterContent storeName={storeName} />}
			</div>
		</footer>
	);
}

function DemoFooterContent() {
	const phoneNumberAM = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_AM;
	const encodedMessageAM = `Hola Andrés me interesa el sistema de ventas por Whatsapp, me contas un poco más?`;

	return (
		<>
			<p>Esta es una tienda de demostración.</p>
			<p>
				Desarrollado por{' '}
				<span className="font-semibold text-gray-800">Andrés Medina</span>
			</p>
			<p>
				Contacto:{' '}
				<a href="mailto:andres.medina.arg@gmail.com" className={linkClass}>
					andres.medina.arg@gmail.com
				</a>
			</p>
			<p>
				Te interesa implementar este sistema de ventas por WhatsApp?{' '}
				<a
					href={`https://wa.me/${phoneNumberAM}?text=${encodedMessageAM}`}
					className={linkClass}
				>
					Contactame!
				</a>
			</p>
		</>
	);
}

function StoreFooterContent({ storeName }: { storeName: string }) {
	return (
		<>
			<p>Pedidos por WhatsApp · {storeName}</p>
			<HelpButton label="¿Necesitás ayuda?" className={linkClass} />
		</>
	);
}
