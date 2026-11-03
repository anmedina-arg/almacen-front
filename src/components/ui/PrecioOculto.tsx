interface PrecioOcultoProps {
  /** Altura de la línea de texto del precio que reemplaza, para no mover la tarjeta. */
  className?: string;
}

/**
 * Líneas grises que ocupan el lugar del precio de un producto Sin stock
 * (ver CONTEXT.md). Es decorativo a propósito: no hay número en el DOM ni
 * texto para lectores de pantalla — el aviso lo da el cartel "Sin Stock".
 */
export function PrecioOculto({ className = '' }: PrecioOcultoProps) {
  return (
    <span aria-hidden="true" className={`flex items-center gap-1 ${className}`}>
      <span className="h-1.5 w-4 rounded-full bg-gray-300" />
      <span className="h-1.5 w-4 rounded-full bg-gray-300" />
      <span className="h-1.5 w-4 rounded-full bg-gray-300" />
    </span>
  );
}
