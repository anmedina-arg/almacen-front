import { describe, expect, it } from 'vitest';
import { productMetadataTag, productStockTag } from './tags';

describe('productMetadataTag (#145)', () => {
  it('es estable para el mismo storeId', () => {
    expect(productMetadataTag(1)).toBe(productMetadataTag(1));
  });

  it('difiere entre Stores distintas', () => {
    expect(productMetadataTag(1)).not.toBe(productMetadataTag(2));
  });
});

describe('productStockTag (#146)', () => {
  it('es estable para el mismo storeId + productId', () => {
    expect(productStockTag(1, 10)).toBe(productStockTag(1, 10));
  });

  it('difiere entre productos de la misma Store', () => {
    expect(productStockTag(1, 10)).not.toBe(productStockTag(1, 11));
  });

  it('difiere entre Stores para el mismo productId', () => {
    expect(productStockTag(1, 10)).not.toBe(productStockTag(2, 10));
  });
});
