'use client';

export function HelpButton() {
	const handleResetPopup = () => {
		localStorage.removeItem('hasSeenPopup');
		window.location.reload();
	};

	return (
		<button
			onClick={handleResetPopup}
			aria-label="Ayuda"
			className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors cursor-pointer select-none flex-shrink-0"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
				<circle cx="12" cy="12" r="10" />
				<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
				<circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
			</svg>
		</button>
	);
}

export default HelpButton;
