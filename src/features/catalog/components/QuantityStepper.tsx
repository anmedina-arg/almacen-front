'use client';

import { useEffect, useRef } from 'react';

interface QuantityStepperProps {
  productName: string;
  /** Cantidad en el carrito: 0 muestra "Agregar", mayor a 0 muestra menos, cantidad y más. */
  quantity: number;
  /** Cantidad ya formateada para mostrar (ej. "2", "500gr", "1.5kg"). */
  quantityLabel: string;
  isAtStockLimit: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

const touchTarget =
  'inline-flex h-11 items-center justify-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-green disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Controles de cantidad del catálogo (#172): todo lo que se toca mide 44 px.
 * Con cantidad 0 es un solo botón "Agregar"; con cantidad, menos, cantidad y
 * más en fila. El catálogo del admin usa QuantityButton, no este componente.
 *
 * El botón de agregar es siempre el mismo elemento, solo cambia de forma: así
 * el foco del teclado no se pierde al pasar de 0 a 1. Cuando la cantidad vuelve
 * a 0 desde el botón de menos, el foco se lleva al botón de agregar.
 */
export function QuantityStepper({
  productName,
  quantity,
  quantityLabel,
  isAtStockLimit,
  onAdd,
  onRemove,
}: QuantityStepperProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const removedWithMinus = useRef(false);
  const hasQuantity = quantity > 0;

  useEffect(() => {
    if (quantity === 0 && removedWithMinus.current) {
      addButtonRef.current?.focus();
    }
    removedWithMinus.current = false;
  }, [quantity]);

  const announcement = hasQuantity
    ? `${productName}: ${quantityLabel} en el pedido${isAtStockLimit ? ', máximo disponible' : ''}`
    : '';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center">
        {hasQuantity && (
          <button
            type="button"
            onClick={() => {
              removedWithMinus.current = true;
              onRemove();
            }}
            aria-label={`Quitar ${productName}`}
            className={`${touchTarget} w-11 rounded-full border-2 border-action-green bg-white text-2xl leading-none text-action-green-deep hover:bg-selected-wash`}
          >
            <span aria-hidden="true">−</span>
          </button>
        )}
        {hasQuantity && (
          <span aria-hidden="true" className="min-w-[30px] px-1 text-center text-[17px] font-bold">
            {quantityLabel}
          </span>
        )}
        <button
          ref={addButtonRef}
          type="button"
          onClick={onAdd}
          disabled={isAtStockLimit}
          aria-label={`Agregar ${productName}`}
          className={
            hasQuantity
              ? `${touchTarget} w-11 rounded-full bg-action-green text-2xl leading-none text-white hover:bg-action-green-deep`
              : `${touchTarget} gap-1 rounded-[22px] border-2 border-action-green bg-white px-3.5 text-[15px] text-action-green-deep hover:bg-selected-wash`
          }
        >
          <span aria-hidden="true">+</span>
          {!hasQuantity && ' Agregar'}
        </button>
      </div>
      {isAtStockLimit && (
        <span aria-hidden="true" className="text-center text-xs font-medium leading-tight text-orange-500">
          Máx. disponible
        </span>
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
