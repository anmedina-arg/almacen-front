const CONTACT_PHONE = '+5493816713512';

export function ProductSearchEmptyState() {
  return (
    <div className="w-full max-w-xl mx-auto p-4 text-center text-sm text-gray-700 bg-orange-400 rounded-md">
      <p>
        no hemos encontrado el producto, por favor contactate con Andrés o Maria. Gracias. Andrés:{' '}
        <a href={`tel:${CONTACT_PHONE}`} className="underline font-semibold">
          {CONTACT_PHONE}
        </a>
      </p>
    </div>
  );
}
