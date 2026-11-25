/**
 * Costo y margen del ranking de productos según la flag `costos` (#179, ticket
 * #186, ADR-0018). La RPC `get_top_products` los calcula siempre; acá se decide
 * qué sale en la respuesta:
 *  - flag apagada: ni costo ni margen, no alcanza con ocultarlos en la pantalla;
 *  - flag encendida: un producto sin costo registrado sale "sin costo" (costo y
 *    margen en null), porque la base lo devuelve con costo 0 y margen igual al
 *    precio completo, que se leería como margen total.
 */
interface RankingCostFields {
  current_cost?: number | null;
  margin?: number | null;
  margin_pct?: number | null;
}

export function applyRankingCosts<T extends RankingCostFields>(rows: T[], costsEnabled: boolean): T[] {
  return rows.map((row) => {
    if (!costsEnabled) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { current_cost, margin, margin_pct, ...withoutCosts } = row;
      return withoutCosts as T;
    }
    if (!(Number(row.current_cost) > 0)) {
      return { ...row, current_cost: null, margin: null, margin_pct: null };
    }
    return row;
  });
}
