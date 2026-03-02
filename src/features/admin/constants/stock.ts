import type { StockMovementType } from '../types/stock.types';

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  manual_adjustment: 'Ajuste manual',
  initial_count: 'Conteo inicial',
  correction: 'Correccion',
  loss: 'Pérdida / Merma',
  sale: 'Venta',
  purchase: 'Compra / Reposicion',
  return: 'Devolucion',
};

export const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  manual_adjustment: 'bg-blue-100 text-blue-700',
  initial_count: 'bg-purple-100 text-purple-700',
  correction: 'bg-yellow-100 text-yellow-700',
  loss: 'bg-red-100 text-red-700',
  sale: 'bg-orange-100 text-orange-700',
  purchase: 'bg-green-100 text-green-700',
  return: 'bg-teal-100 text-teal-700',
};
