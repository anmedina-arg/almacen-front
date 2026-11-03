import { describe, expect, it } from 'vitest';
import { generateWhatsAppMessage } from './messageUtils';
import { formatOrderTotal, getOrderTotal } from './orderSummary';
import type { CartItem } from '../types';

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 1,
    lineId: 'line-1',
    name: 'Gaseosa',
    price: 3000,
    quantity: 1,
    unitPrice: 3000,
    isByWeight: false,
    saleType: 'unit',
    ...overrides,
  };
}

describe('generateWhatsAppMessage', () => {
  it('un pedido vacío saluda sin detalle', () => {
    expect(generateWhatsAppMessage([])).toBe('Hola! Quiero hacerte un pedido');
  });

  it('cierra con el total del pedido', () => {
    const items = [
      makeItem({ id: 1, quantity: 3, unitPrice: 3000 }),
      makeItem({ id: 2, lineId: 'line-2', name: 'Coca Cola', quantity: 1, unitPrice: 3500 }),
    ];

    expect(generateWhatsAppMessage(items)).toMatch(/\nTotal = \$12500$/);
  });

  it('escribe el mismo total que muestra la barra de pedido, sin ruido de coma flotante', () => {
    const items = [
      makeItem({ id: 1, quantity: 1, unitPrice: 0.1 }),
      makeItem({ id: 2, lineId: 'line-2', quantity: 1, unitPrice: 0.2 }),
    ];

    const message = generateWhatsAppMessage(items);

    expect(message).toContain(`Total = ${formatOrderTotal(getOrderTotal(items))}`);
    expect(message).toMatch(/Total = \$0\.3$/);
  });
});
