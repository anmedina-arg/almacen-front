/**
 * Franja fija del catálogo de una Demo Store (#153): avisa que los precios
 * son de ejemplo para que un prospecto no los tome como una oferta real.
 * Solo la renderiza la página del catálogo cuando `stores.is_demo` es true;
 * el mensaje de WhatsApp no cambia (queremos que el prospecto vea el
 * resultado tal cual lo recibiría un almacén).
 */
export function DemoStoreBanner() {
  return (
    <div
      role="note"
      className="bg-amber-400 px-3 py-1 text-center text-xs font-semibold tracking-wide text-amber-950"
    >
      Tienda de demostración · precios de ejemplo
    </div>
  );
}
