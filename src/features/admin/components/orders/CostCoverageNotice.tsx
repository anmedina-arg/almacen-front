'use client';

import { useEffect, useState } from 'react';
import { useStoreSlug } from '@/hooks/useStoreSlug';
import type { Order } from '../../types/order.types';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

/**
 * Aviso al encender el módulo `costos` en una Store con historia (#186,
 * ADR-0018): los pedidos anteriores no tienen costo registrado, así que se
 * muestran "sin costo" y no suman al margen. Encender la flag rige hacia
 * adelante, no hay backfill. Solo aparece si hay pedidos sin costo completo.
 * Se puede cerrar y no vuelve a aparecer en ese navegador.
 */
export function CostCoverageNotice({ orders }: { orders: Order[] }) {
  const { costos } = useFeatureFlags();
  const slug = useStoreSlug();
  const storageKey = `costos-aviso-visto:${slug}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const withoutCost = orders.filter((order) => order.cost_coverage === 'none').length;
  const partial = orders.filter((order) => order.cost_coverage === 'partial').length;
  if (!costos || dismissed || withoutCost + partial === 0) return null;

  const close = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Sin almacenamiento el aviso vuelve a aparecer en la próxima visita: no es grave.
    }
  };

  return (
    <div role="status" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
      <p>
        <strong>Los costos rigen desde que se cargan.</strong> {withoutCost > 0 && <>{withoutCost} pedido{withoutCost === 1 ? '' : 's'} no tiene{withoutCost === 1 ? '' : 'n'} costo registrado y se muestra{withoutCost === 1 ? '' : 'n'} como “sin costo”. </>}
        {partial > 0 && <>{partial} tiene{partial === 1 ? '' : 'n'} costo solo en algunos ítems. </>}
        El margen se calcula únicamente con los ítems que tienen costo; los pedidos anteriores no se corrigen solos.
      </p>
      <button onClick={close} aria-label="Cerrar aviso" className="text-amber-700 hover:text-amber-900 text-lg leading-none">
        ×
      </button>
    </div>
  );
}
