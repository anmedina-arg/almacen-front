import { describe, expect, it } from 'vitest';
import { productMetadataTag } from './tags';

describe('productMetadataTag (#145)', () => {
  it('es estable para el mismo storeId', () => {
    expect(productMetadataTag(1)).toBe(productMetadataTag(1));
  });

  it('difiere entre Stores distintas', () => {
    expect(productMetadataTag(1)).not.toBe(productMetadataTag(2));
  });
});
