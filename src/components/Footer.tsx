import React from 'react';

/**
 * Componente Footer
 */
const Footer: React.FC = () => {

	const phoneNumberAM = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_AM;
	const encodedMessageAM = `Hola Andrés me interesa el sistema de ventas por Whatsapp, me contas un poco más?`

	return (
		<footer className="bg-gray-100 border-t border-gray-200 mt-12 pb-20">
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="text-center">
					<p className="text-gray-600 text-sm mb-2">
						Desarrollado por{' '}
						<span className="font-semibold text-gray-800">Andrés Medina</span>
					</p>
					<p className="text-gray-500 text-xs mb-2">
						Contacto: {' '}
						<a
							href="mailto:andres.medina.arg@gmail.com"
							className="text-blue-600 hover:text-blue-800 underline"
						>
							andres.medina.arg@gmail.com
						</a>
					</p>
					<p className="text-gray-500 text-xs">
						Te interesa implementar este sistema de ventas por WhatsApp?{' '}
						<a
							href={`https://wa.me/${phoneNumberAM}?text=${encodedMessageAM}`}
							className="text-blue-600 hover:text-blue-800 underline"
						>
							Contactame!
						</a>
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer; 