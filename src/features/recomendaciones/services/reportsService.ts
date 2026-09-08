import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '@/lib/api/errors';

/**
 * Service de Informes (CSV exports) — parte del dominio Recomendaciones/
 * Informes (#125, ver ADR-0013). Comparte rowsToCsv: antes estaba
 * copiada, sin variar, en las dos rutas de export.
 */

export async function exportProductos(supabase: SupabaseClient, storeId: number): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('export_productos', { p_store_id: storeId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new NotFoundError('Sin productos para exportar');
  return data as Record<string, unknown>[];
}

export interface ExportVentasParams {
  startDate: string | null;
  endDate: string | null;
}

export async function exportVentas(
  supabase: SupabaseClient,
  storeId: number,
  params: ExportVentasParams
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('export_ventas', {
    p_store_id: storeId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new NotFoundError('Sin datos para el período seleccionado');
  return data as Record<string, unknown>[];
}

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(','))].join('\n');
}
