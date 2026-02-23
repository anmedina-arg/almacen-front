'use client';

import { useReducer, useCallback } from 'react';

// ============================================================================
// State & Actions
// ============================================================================

interface EntryValue {
  increment: number;
  notes: string;
}

interface StockEntryState {
  /** productId → { increment, notes } */
  entries: Map<number, EntryValue>;
}

type StockEntryAction =
  | { type: 'ADD'; payload: { productId: number; amount: number } }
  | { type: 'REMOVE'; payload: { productId: number; amount: number } }
  | { type: 'SET_NOTES'; payload: { productId: number; notes: string } }
  | { type: 'CLEAR_ENTRY'; payload: { productId: number } }
  | { type: 'CLEAR_ALL' };

// ============================================================================
// Reducer
// ============================================================================

function stockEntryReducer(
  state: StockEntryState,
  action: StockEntryAction
): StockEntryState {
  const next = new Map(state.entries);

  switch (action.type) {
    case 'ADD': {
      const { productId, amount } = action.payload;
      const current = next.get(productId) ?? { increment: 0, notes: '' };
      next.set(productId, {
        ...current,
        increment: current.increment + amount,
      });
      return { entries: next };
    }

    case 'REMOVE': {
      const { productId, amount } = action.payload;
      const current = next.get(productId);
      if (!current) return state;
      const newIncrement = Math.max(0, current.increment - amount);
      if (newIncrement === 0) {
        next.delete(productId);
      } else {
        next.set(productId, { ...current, increment: newIncrement });
      }
      return { entries: next };
    }

    case 'SET_NOTES': {
      const { productId, notes } = action.payload;
      const current = next.get(productId);
      if (!current) return state;
      next.set(productId, { ...current, notes });
      return { entries: next };
    }

    case 'CLEAR_ENTRY': {
      next.delete(action.payload.productId);
      return { entries: next };
    }

    case 'CLEAR_ALL':
      return { entries: new Map() };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useStockEntry() {
  const [state, dispatch] = useReducer(stockEntryReducer, {
    entries: new Map<number, EntryValue>(),
  });

  const addEntry = useCallback((productId: number, amount: number) => {
    dispatch({ type: 'ADD', payload: { productId, amount } });
  }, []);

  const removeEntry = useCallback((productId: number, amount: number) => {
    dispatch({ type: 'REMOVE', payload: { productId, amount } });
  }, []);

  const setNotes = useCallback((productId: number, notes: string) => {
    dispatch({ type: 'SET_NOTES', payload: { productId, notes } });
  }, []);

  const clearEntry = useCallback((productId: number) => {
    dispatch({ type: 'CLEAR_ENTRY', payload: { productId } });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const getEntryAmount = useCallback(
    (productId: number): number => {
      return state.entries.get(productId)?.increment ?? 0;
    },
    [state.entries]
  );

  const getEntryNotes = useCallback(
    (productId: number): string => {
      return state.entries.get(productId)?.notes ?? '';
    },
    [state.entries]
  );

  return {
    entries: state.entries,
    addEntry,
    removeEntry,
    setNotes,
    clearEntry,
    clearAll,
    getEntryAmount,
    getEntryNotes,
  };
}
