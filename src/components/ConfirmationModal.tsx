'use client';

import React from 'react';
import { ConfirmationModalProps } from '@/types';

/**
 * Componente modal de confirmación
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	message,
	onConfirm,
	onCancel,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
				<h3 className="text-xl font-bold mb-4 text-gray-800">
					Vas a enviar el siguiente mensaje con tu pedido:
				</h3>
				<div className="mb-4">
					<div className="bg-gray-50 p-4 rounded text-sm border-l-4 border-green-500">
						<div className="whitespace-pre-line text-gray-800">
							{message}
						</div>
					</div>
				</div>
				<p className="text-sm text-gray-600 mb-4 text-center">¿Lo envías?</p>
				<div className="flex gap-3">
					<button
						onClick={onCancel}
						className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition-colors font-medium"
					>
						Modificar
					</button>
					<button
						onClick={onConfirm}
						className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors font-medium"
					>
						Confirmar
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationModal; 