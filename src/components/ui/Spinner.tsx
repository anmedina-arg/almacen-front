const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

interface SpinnerProps {
  size?: keyof typeof sizeClasses;
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-green-600 ${sizeClasses[size]}`}
    />
  );
}
