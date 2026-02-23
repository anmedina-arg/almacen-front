import React, { useState, useEffect } from "react";

const InfoBanner: React.FC = () => {
	const [showPopup, setShowPopup] = useState(false);

	useEffect(() => {
		const hasSeenPopup = localStorage.getItem("hasSeenPopup");
		if (!hasSeenPopup) {
			setShowPopup(true);
		}
	}, []);

	const handleClose = () => {
		localStorage.setItem("hasSeenPopup", "true");
		setShowPopup(false);
	};

	if (!showPopup) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Fondo desenfocado */}
			<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

			{/* Cartel */}
			<div className="relative bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md w-full shadow-lg">
				<button
					className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
					onClick={handleClose}
				>
					✖
				</button>
				<div className="flex flex-col items-center gap-3">
					<p className="text-2xl font-medium text-blue-800 mt-4">💡¿Cómo hacer tu pedido?</p>
					<ol className="flex flex-col items-center justify-center gap-4 text-xl text-blue-600 mt-1 mx-2">
						<li className="list-decimal list-inside">Agrega productos con los botones + y -</li>
						<li className="list-decimal list-inside">Haz clic en el botón verde de WhatsApp</li>
						<li className="list-decimal list-inside">Revisa tu pedido y confirma el envío</li>
					</ol>
					<button
						className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
						onClick={handleClose}
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default InfoBanner;
