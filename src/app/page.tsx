import Link from 'next/link';

export default function RootPlaceholder() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center font-barlow">
      <h1 className="text-2xl font-semibold">Market Cevil</h1>
      <p className="mt-2 text-neutral-600">
        Buscá tu tienda en la URL, por ejemplo:{' '}
        <Link href="/market-del-cevil" className="underline">
          /market-del-cevil
        </Link>
      </p>
    </div>
  );
}
