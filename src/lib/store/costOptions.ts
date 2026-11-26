/**
 * Si la Store tiene el módulo `costos` (ADR-0018), resuelto por la ruta con
 * `getCostsEnabled`. Los servicios que devuelven o guardan Costo y margen lo
 * reciben como último parámetro. Sin indicación se trata como apagado: el
 * costo no sale (falla cerrado), así que una ruta que se olvida de pasarlo no
 * filtra costos.
 */
export interface CostOptions {
  costsEnabled: boolean;
}

export const NO_COSTS: CostOptions = { costsEnabled: false };
