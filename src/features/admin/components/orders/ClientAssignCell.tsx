'use client';

import { useState } from 'react';
import type { Client, Barrio } from '../../types/client.types';
import { useAssignClient, useUnassignClient } from '../../hooks/useAssignClient';

const MANZANA_LOTE_REGEX = /^[A-Z](0[1-9]|[12][0-9]|30)$/;

interface ClientAssignCellProps {
  orderId: number;
  client: Client | null | undefined;
}

export function ClientAssignCell({ orderId, client }: ClientAssignCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [barrio, setBarrio] = useState<Barrio>('AC1');
  const [manzanaLote, setManzanaLote] = useState('');
  const [otrosDesc, setOtrosDesc] = useState('');
  const [validationError, setValidationError] = useState('');

  const { mutate: assign, isPending: isAssigning } = useAssignClient();
  const { mutate: unassign, isPending: isUnassigning } = useUnassignClient();

  const handleOpenForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBarrio('AC1');
    setManzanaLote('');
    setOtrosDesc('');
    setValidationError('');
    setIsEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (barrio !== 'otros') {
      const upper = manzanaLote.trim().toUpperCase();
      if (!MANZANA_LOTE_REGEX.test(upper)) {
        setValidationError('Formato inválido. Ejemplo: H10, A01, Z30');
        return;
      }
      assign(
        { orderId, input: { barrio, manzana_lote: upper } },
        { onSuccess: () => setIsEditing(false) }
      );
    } else {
      const desc = otrosDesc.trim();
      assign(
        { orderId, input: { barrio: 'otros', ...(desc ? { manzana_lote: desc } : {}) } },
        { onSuccess: () => setIsEditing(false) }
      );
    }
  };

  const handleUnassign = (e: React.MouseEvent) => {
    e.stopPropagation();
    unassign(orderId);
  };

  const handleManzanaLoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManzanaLote(e.target.value.toUpperCase());
    setValidationError('');
  };

  // — Assigned state —
  if (client && !isEditing) {
    return (
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleOpenForm}
          className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
          title="Cambiar cliente"
        >
          {client.display_code}
          {client.barrio === 'otros' && client.manzana_lote && (
            <span className="font-sans font-normal normal-case ml-1 text-indigo-500">
              {client.manzana_lote}
            </span>
          )}
        </button>
        <button
          onClick={handleUnassign}
          disabled={isUnassigning}
          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 text-xs leading-none"
          title="Quitar cliente"
          aria-label="Quitar cliente"
        >
          ×
        </button>
      </div>
    );
  }

  // — Edit form —
  if (isEditing) {
    return (
      <div
        className="flex flex-col gap-1.5 min-w-[160px]"
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={barrio}
          onChange={(e) => {
            setBarrio(e.target.value as Barrio);
            setValidationError('');
          }}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        >
          <option value="AC1">AC1</option>
          <option value="AC2">AC2</option>
          <option value="otros">otros</option>
        </select>

        {barrio !== 'otros' ? (
          <input
            type="text"
            value={manzanaLote}
            onChange={handleManzanaLoteChange}
            placeholder="Ej: H10"
            maxLength={3}
            className={`text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 uppercase w-20 ${
              validationError ? 'border-red-400' : 'border-gray-300'
            }`}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={otrosDesc}
            onChange={(e) => { setOtrosDesc(e.target.value); setValidationError(''); }}
            placeholder="Descripción (opcional)"
            className={`text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full ${
              validationError ? 'border-red-400' : 'border-gray-300'
            }`}
            autoFocus
          />
        )}

        {validationError && (
          <span className="text-xs text-red-500">{validationError}</span>
        )}

        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={isAssigning}
            className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isAssigning ? '...' : 'Guardar'}
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

  // — Unassigned state —
  return (
    <button
      onClick={handleOpenForm}
      className="text-xs text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
    >
      + Asignar
    </button>
  );
}
