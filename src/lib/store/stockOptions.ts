/**
 * Si la Store tiene el módulo `stock` (ADR-0012), resuelto por la ruta con
 * `getStockEnabled`. Los servicios que devuelven o guardan el máximo de stock (#184)
 * lo reciben junto con `CostOptions`. Sin indicación se trata como apagado: el
 * máximo ni se guarda ni se devuelve (falla cerrado).
 */
export interface StockOptions {
  stockEnabled: boolean;
}
