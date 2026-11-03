'use client';

import { headerActionClass } from './headerAction';

export function HelpButton() {
	const handleShowHelp = () => {
		window.dispatchEvent(new CustomEvent('show-help-popup'));
	};

	return (
		<button type="button" onClick={handleShowHelp} className={headerActionClass}>
			Ayuda
		</button>
	);
}

export default HelpButton;
