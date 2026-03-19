'use client';

import type { ConfirmationModalProps } from '../types';
import { SuggestionsSection } from './SuggestionsSection';

/**
 * Componente modal de confirmación
 */
export function ConfirmationModal({
	isOpen,
	message,
	onConfirm,
	onCancel,
	isLoading = false,
	cartProductIds,
}: ConfirmationModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
				{/* Cabecera + mensaje — scrolleable */}
				<div className="overflow-y-auto flex-1 p-6 pb-2">
					<h3 className="text-xl font-bold mb-4 text-gray-800">
						Vas a enviar el siguiente mensaje con tu pedido:
					</h3>
					<div className="bg-gray-50 p-4 rounded text-sm border-l-4 border-green-500">
						<div className="whitespace-pre-line text-gray-800">
							{message}
						</div>
					</div>
				</div>

				{/* Sugerencias + botones — siempre visibles al fondo */}
				<div className="flex-shrink-0 px-6 pb-6 pt-2">
					{cartProductIds && cartProductIds.length > 0 && (
						<SuggestionsSection cartProductIds={cartProductIds} />
					)}
					<p className="text-sm text-gray-600 mb-3 text-center mt-4">¿Lo envías?</p>
					<div className="flex gap-3">
						<button
							onClick={onCancel}
							disabled={isLoading}
							className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Modificar
						</button>
						<button
							onClick={onConfirm}
							disabled={isLoading}
							className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Enviando...' : 'Confirmar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ConfirmationModal;
