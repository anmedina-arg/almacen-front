/**
 * Marca "con faltante" de la lista de Pedidos (#162): un pedido pendiente
 * con algún ítem que pidió más de lo Disponible. El detalle dice cuál.
 */
export function ShortfallBadge() {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
      title="Algún ítem pidió más de lo Disponible"
    >
      Con faltante
    </span>
  );
}
