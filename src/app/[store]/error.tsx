'use client';

// Error boundary del catálogo de cada Store (#190): si algo falla al renderizar
// (ej. la base no contestó), el visitante ve un mensaje claro con reintento en
// vez de una pantalla en blanco o un falso "tienda no encontrada".
export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="font-barlow flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">No pudimos cargar el catálogo</h1>
      <p className="text-gray-600">Hubo un problema momentáneo. Probá de nuevo en unos segundos.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-black px-5 py-2 font-medium text-white"
      >
        Reintentar
      </button>
    </div>
  );
}
