/**
 * Margen de un pedido (#179, ticket #186, ADR-0018): se calcula solo con los
 * ítems que tienen Costo registrado. Un ítem sin Costo (`unit_cost` 0: el
 * pedido es anterior a encender el módulo, o el producto no tenía costo) no
 * suma ni infla el margen; si ningún ítem tiene costo, el pedido queda "sin
 * costo" y no hay margen. Sin backfill: encender la flag rige hacia adelante.
 */

/** `complete`: todos los ítems tienen costo; `partial`: algunos; `none`: ninguno. */
export type CostCoverage = 'complete' | 'partial' | 'none';

export interface MarginItem {
  unit_price: number | string;
  unit_cost: number | string;
  subtotal: number | string;
}

export interface OrderMargin {
  cost_coverage: CostCoverage;
  /** Costo de los ítems que tienen costo; null si ninguno lo tiene. */
  total_cost: number | null;
  /** Venta menos costo, solo de los ítems con costo; null si ninguno lo tiene. */
  margin: number | null;
  /** Margen sobre la venta de los ítems con costo; null si ninguno lo tiene. */
  margin_pct: number | null;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function computeOrderMargin(items: MarginItem[]): OrderMargin {
  let cost = 0;
  let revenue = 0;
  let covered = 0;

  for (const item of items) {
    const unitPrice = Number(item.unit_price);
    const unitCost = Number(item.unit_cost);
    // Sin precio o sin costo no hay proporción que medir: el ítem queda sin costo.
    if (!(unitPrice > 0 && unitCost > 0)) continue;
    // subtotal × (costo / precio), no cantidad × costo: en productos por peso la
    // cantidad está en gramos y el precio y el costo son por 100 gr.
    const subtotal = Number(item.subtotal);
    cost += subtotal * (unitCost / unitPrice);
    revenue += subtotal;
    covered++;
  }

  if (covered === 0) return { cost_coverage: 'none', total_cost: null, margin: null, margin_pct: null };

  const margin = revenue - cost;
  return {
    cost_coverage: covered === items.length ? 'complete' : 'partial',
    total_cost: round2(cost),
    margin: round2(margin),
    margin_pct: revenue > 0 ? round2((margin / revenue) * 100) : 0,
  };
}

/**
 * Campos de costo y margen que se suman a un pedido en una respuesta: los calculados
 * con el módulo `costos`, ninguno sin él.
 */
export function orderCostFields(items: Partial<MarginItem>[], costsEnabled: boolean): Partial<OrderMargin> {
  if (!costsEnabled) return {};
  return computeOrderMargin(items.map((item) => ({ unit_price: item.unit_price ?? 0, unit_cost: item.unit_cost ?? 0, subtotal: item.subtotal ?? 0 })));
}

/** El ítem sin su costo: lo que sale en una respuesta de la Store sin el módulo `costos`. */
export function omitItemCost<T extends { unit_cost?: unknown }>(item: T): Omit<T, 'unit_cost'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { unit_cost, ...rest } = item;
  return rest;
}
