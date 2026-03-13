interface QuantityButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant: 'increment' | 'decrement';
}

export function QuantityButton({ variant, ...props }: QuantityButtonProps) {
	const base = 'text-white rounded-md w-6 h-6 flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
	const variantStyles = variant === 'increment'
		? `${base} bg-green-500 hover:bg-green-600`
		: `${base} bg-red-500 hover:bg-red-600`;

	return (
		<button className={variantStyles} {...props}>{variant === 'increment' ? '+' : '-'}</button>
	);
}

export default QuantityButton;
