'use client';

import { useState } from 'react';
import type { OrderPayment, PaymentMethod } from '../../types/payment.types';
import { PAYMENT_EMOJI } from '../../types/payment.types';
import { useSetOrderPayments, useDeleteOrderPayment } from '../../hooks/useOrderPayments';
import { formatPrice } from '@/utils/formatPrice';

interface PaymentCellProps {
  orderId: number;
  orderTotal: number;
  payments: OrderPayment[];
}

const METHODS: PaymentMethod[] = ['efectivo', 'transferencia'];

export function PaymentCell({ orderId, orderTotal, payments }: PaymentCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [selected, setSelected] = useState<PaymentMethod>('efectivo');
  const [isBoth, setIsBoth] = useState(false);
  const [amounts, setAmounts] = useState<Record<PaymentMethod, string>>({
    efectivo: '',
    transferencia: '',
  });
  const [validationError, setValidationError] = useState('');

  const { mutate: setPayments, isPending: isSaving } = useSetOrderPayments();
  const { mutate: deletePayment, isPending: isDeleting } = useDeleteOrderPayment();

  const openForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValidationError('');

    if (payments.length === 2) {
      setIsBoth(true);
      setAmounts({
        efectivo: payments.find((p) => p.method === 'efectivo')?.amount?.toString() ?? '',
        transferencia: payments.find((p) => p.method === 'transferencia')?.amount?.toString() ?? '',
      });
    } else if (payments.length === 1) {
      setSelected(payments[0].method);
      setIsBoth(false);
      setAmounts({ efectivo: '', transferencia: '' });
    } else {
      setSelected('efectivo');
      setIsBoth(false);
      setAmounts({ efectivo: '', transferencia: '' });
    }

    setIsEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValidationError('');

    if (isBoth) {
      const amt1 = parseFloat(amounts.efectivo);
      const amt2 = parseFloat(amounts.transferencia);

      if (!amounts.efectivo || !amounts.transferencia || isNaN(amt1) || isNaN(amt2)) {
        setValidationError('Ingresá el monto de ambos métodos');
        return;
      }
      if (amt1 <= 0 || amt2 <= 0) {
        setValidationError('Los montos deben ser mayores a 0');
        return;
      }
      if (Math.abs(amt1 + amt2 - orderTotal) > 0.01) {
        setValidationError(`Los montos deben sumar ${formatPrice(orderTotal)}`);
        return;
      }

      setPayments(
        {
          orderId,
          orderTotal,
          payments: [
            { method: 'efectivo', amount: amt1 },
            { method: 'transferencia', amount: amt2 },
          ],
        },
        { onSuccess: () => setIsEditing(false) }
      );
    } else {
      setPayments(
        { orderId, orderTotal, payments: [{ method: selected }] },
        { onSuccess: () => setIsEditing(false) }
      );
    }
  };

  const handleDelete = (e: React.MouseEvent, paymentId: number) => {
    e.stopPropagation();
    deletePayment({ orderId, paymentId });
  };

  // ── Saved display ──
  if (!isEditing) {
    if (payments.length === 0) {
      return (
        <button
          onClick={openForm}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
        >
          + Agregar
        </button>
      );
    }

    if (payments.length === 1) {
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={openForm}
            className="text-lg leading-none hover:opacity-70 transition-opacity"
            title={`${payments[0].method} — click para editar`}
          >
            {PAYMENT_EMOJI[payments[0].method]}
          </button>
          <button
            onClick={(e) => handleDelete(e, payments[0].id)}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 text-xs leading-none ml-0.5"
            title="Quitar método de pago"
          >
            ×
          </button>
        </div>
      );
    }

    // 2 payments
    return (
      <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-1">
            <button
              onClick={openForm}
              className="text-base leading-none hover:opacity-70 transition-opacity"
              title={`${p.method} — click para editar`}
            >
              {PAYMENT_EMOJI[p.method]}
            </button>
            <span className="text-xs font-mono text-gray-700">
              {p.amount !== null ? formatPrice(p.amount) : ''}
            </span>
            <button
              onClick={(e) => handleDelete(e, p.id)}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 text-xs leading-none"
              title="Quitar este método"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }

  // ── Edit form ──
  return (
    <div
      className="flex flex-col gap-2 min-w-[170px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Method toggles */}
      <div className="flex gap-2">
        {METHODS.map((method) => {
          const isActive = isBoth || selected === method;
          return (
            <button
              key={method}
              onClick={(e) => {
                e.stopPropagation();
                if (!isBoth) setSelected(method);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-sm transition-colors ${
                isActive
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
              } ${isBoth ? 'cursor-default' : 'cursor-pointer'}`}
              title={method}
            >
              <span className="text-base">{PAYMENT_EMOJI[method]}</span>
              <span className="text-xs capitalize">{method}</span>
            </button>
          );
        })}
      </div>

      {/* Ambos checkbox */}
      <label
        className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-600"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isBoth}
          onChange={(e) => {
            setIsBoth(e.target.checked);
            setValidationError('');
            setAmounts({ efectivo: '', transferencia: '' });
          }}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
        />
        Ambos métodos
      </label>

      {/* Amount inputs when both selected */}
      {isBoth && (
        <div className="flex flex-col gap-1">
          {METHODS.map((method) => (
            <div key={method} className="flex items-center gap-1.5">
              <span className="text-base w-5">{PAYMENT_EMOJI[method]}</span>
              <input
                type="number"
                value={amounts[method]}
                onChange={(e) => {
                  setAmounts((prev) => ({ ...prev, [method]: e.target.value }));
                  setValidationError('');
                }}
                placeholder="Monto"
                min="0"
                step="0.01"
                className="w-24 text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      )}

      {validationError && (
        <span className="text-xs text-red-500">{validationError}</span>
      )}

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? '...' : 'Guardar'}
        </button>
        <button
          onClick={handleCancel}
          className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
