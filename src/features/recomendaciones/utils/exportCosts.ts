/**
 * Costo y margen de los informes descargables según la flag `costos` (#179,
 * ticket #186, ADR-0018). Las RPC `export_productos` y `export_ventas` los
 * calculan siempre; acá se decide qué sale en el CSV:
 *  - flag apagada: el informe no trae esas columnas;
 *  - flag encendida: una fila sin costo registrado sale con costo y margen en
 *    blanco, no con un margen igual a la venta.
 */
export type ExportKind = 'productos' | 'ventas';

/** Columna con el costo de la fila y las columnas que dependen de él. */
const COST_COLUMNS: Record<ExportKind, { cost: string; dependents: string[] }> = {
  productos: { cost: 'costo', dependents: ['margen', 'margen_pct'] },
  ventas: { cost: 'costo_total', dependents: ['margen', 'margen_pct'] },
};

export function applyExportCosts(
  rows: Record<string, unknown>[],
  kind: ExportKind,
  costsEnabled: boolean
): Record<string, unknown>[] {
  const { cost, dependents } = COST_COLUMNS[kind];
  const columns = [cost, ...dependents];

  return rows.map((row) => {
    if (!costsEnabled) {
      return Object.fromEntries(Object.entries(row).filter(([key]) => !columns.includes(key)));
    }
    if (!(Number(row[cost]) > 0)) {
      return { ...row, ...Object.fromEntries(columns.map((column) => [column, null])) };
    }
    return row;
  });
}
