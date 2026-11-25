import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildImportTemplate, templateHeaders } from './importTemplate';

// Seam B de la spec #179 (ticket #188): la Plantilla de importación se arma según los
// módulos de la Store. Siempre trae las columnas del Producto y el Precio; suma `costo`
// con `costos` y `stock_inicial` con `stock`. Nunca trae el máximo de stock.
const BASE = ['nombre', 'categoría', 'subcategoría', 'tipo de venta', 'precio', 'imagen_url', 'activo'];

describe.each([
  [true, true, [...BASE, 'costo', 'stock_inicial']],
  [true, false, [...BASE, 'costo']],
  [false, true, [...BASE, 'stock_inicial']],
  [false, false, BASE],
])('Plantilla con costos=%s, stock=%s', (costos, stock, expected) => {
  const modules = { costos, stock };

  it('trae solo las columnas de los módulos de la Store', () => {
    expect(templateHeaders(modules)).toEqual(expected);
  });

  it('el CSV descargable tiene esos encabezados', async () => {
    const csv = (await buildImportTemplate('csv', modules)).toString('utf8').replace(/^﻿/, '');
    expect(csv.split(/\r?\n/)[0].split(';')).toEqual(expected);
  });

  it('el .xlsx tiene esos encabezados y una hoja de instrucciones que solo explica esas columnas', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await buildImportTemplate('xlsx', modules)) as unknown as ArrayBuffer);

    const headerRow = workbook.getWorksheet('Productos')!.getRow(1);
    expect((headerRow.values as unknown[]).slice(1)).toEqual(expected);

    const documented = (workbook.getWorksheet('Instrucciones')!.getColumn(1).values as unknown[]).filter(
      (v): v is string => typeof v === 'string' && v !== 'Columna'
    );
    expect(documented.includes('costo')).toBe(costos);
    expect(documented.includes('stock_inicial')).toBe(stock);
  });
});
