import React, { useState, useEffect } from "react";

const InfoBanner: React.FC = () => {
	const [show, setShow] = useState(true);

	if (!show) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Fondo desenfocado */}
			<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

			{/* Cartel */}
			<div className="relative bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md w-full shadow-lg">
				<button
					className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
					onClick={() => setShow(false)}
				>
					✖
				</button>
				<div className="flex flex-col items-center gap-3">
					<p className="text-2xl font-medium text-blue-800 mt-4">💡¿Cómo hacer tu pedido?</p>
					<ol className="flex flex-col items-center justify-center gap-4 text-xl text-blue-600 mt-1 mx-2">
						<li className="list-decimal">Agrega productos con los botones + y -</li>
						<li className="list-decimal">Haz clic en el botón verde de WhatsApp</li>
						<li className="list-decimal">Revisa tu pedido y confirma el envío</li>
					</ol>
					<button
						className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
						onClick={() => setShow(false)}
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default InfoBanner;
