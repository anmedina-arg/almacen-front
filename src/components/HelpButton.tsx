'use client';

export function HelpButton() {
	const handleResetPopup = () => {
		localStorage.removeItem('hasSeenPopup');
		window.location.reload();
	};

	return (
		<strong onClick={handleResetPopup}>Como?</strong>
	);
}

export default HelpButton;
