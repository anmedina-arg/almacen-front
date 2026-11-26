'use client';

// Último recurso (#190): falla en el layout raíz. Reemplaza al layout entero,
// por eso define su propio <html> y no depende de estilos globales.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: 'sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 20 }}>No pudimos cargar la página</h1>
        <p style={{ color: '#555' }}>Hubo un problema momentáneo. Probá de nuevo en unos segundos.</p>
        <button
          type="button"
          onClick={reset}
          style={{ background: '#000', color: '#fff', border: 0, borderRadius: 8, padding: '8px 20px' }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
