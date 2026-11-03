'use client';

import { headerActionClass } from './headerAction';

interface HelpButtonProps {
	label?: string;
	className?: string;
}

/**
 * Abre la ayuda del catálogo ("¿Cómo hacer tu pedido?"). Por defecto es la
 * acción "Ayuda" del encabezado; el pie lo reutiliza con otro texto y estilo.
 */
export function HelpButton({ label = 'Ayuda', className = headerActionClass }: HelpButtonProps) {
	const handleShowHelp = () => {
		window.dispatchEvent(new CustomEvent('show-help-popup'));
	};

	return (
		<button type="button" onClick={handleShowHelp} className={className}>
			{label}
		</button>
	);
}

export default HelpButton;
