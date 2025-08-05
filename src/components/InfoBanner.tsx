import React from 'react';

/**
 * Componente banner informativo
 */
const InfoBanner: React.FC = () => {
	return (
		<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 max-w-md w-full">
			<div className="flex items-center gap-3">
				<div className="text-blue-500 text-xl">💡</div>
				<div>
					<p className="text-sm font-medium text-blue-800">¿Cómo hacer tu pedido?</p>
					<p className="text-xs text-blue-600 mt-1">
						1. Agrega productos con los botones + y -<br />
						2. Haz clic en el botón verde de WhatsApp<br />
						3. Revisa tu pedido y confirma el envío
					</p>
				</div>
			</div>
		</div>
	);
};

export default InfoBanner; 