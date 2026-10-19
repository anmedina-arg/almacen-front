'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOBILE_MAX_WIDTH } from '@/utils/viewport';

interface DemoPhoneProps {
  /** Path del catálogo de la Demo Store, resuelto por el server (getDemoStore). */
  catalogPath: string;
}

/**
 * Marco de celular con el catálogo de la Demo Store embebido (#153). Es un
 * iframe del mismo origen: el catálogo real, sin un componente "demo"
 * paralelo. El envío del pedido sigue siendo window.open hacia wa.me desde
 * el gesto del usuario dentro del iframe, así que en escritorio abre
 * WhatsApp Web o la app según tenga el prospecto.
 *
 * El iframe recién recibe su src después de decidir el ancho al montar: en
 * una pantalla angosta se redirige sin haber cargado el catálogo dos veces
 * (una en el iframe y otra en la navegación). Hasta entonces el marco se ve
 * vacío un instante.
 */
export function DemoPhone({ catalogPath }: DemoPhoneProps) {
  const router = useRouter();
  const [showFrame, setShowFrame] = useState(false);

  useEffect(() => {
    // Mismo umbral que el generador del mensaje de WhatsApp (MOBILE_MAX_WIDTH):
    // en un celular, un marco de celular no aporta nada.
    if (window.innerWidth <= MOBILE_MAX_WIDTH) {
      router.replace(catalogPath);
      return;
    }
    setShowFrame(true);
  }, [router, catalogPath]);

  return (
    <div className="ck-phone" aria-label="Catálogo de la Demo Store en un celular">
      {showFrame ? (
        <iframe className="ck-phone-screen" src={catalogPath} title="Catálogo de la Demo Store" />
      ) : (
        <div className="ck-phone-screen" aria-hidden="true" />
      )}
    </div>
  );
}
