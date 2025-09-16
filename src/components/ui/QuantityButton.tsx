interface QuantityButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant: 'increment' | 'decrement';
};

const QuantityButton: React.FC<QuantityButtonProps> = ({ variant, ...props }) => {

	const variantStyles = variant === 'increment' ?
		"bg-green-500 hover:bg-green-600 text-white rounded-md w-6 h-6 flex items-center justify-center text-lg font-bold transition-colors"
		:
		"bg-red-500 hover:bg-red-600 text-white rounded-md w-6 h-6 flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

	return (
		<button className={variantStyles} {...props}>{variant === 'increment' ? '+' : '-'}</button>
	)
};

export default QuantityButton;