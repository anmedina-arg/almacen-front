import ExcelJS from 'exceljs';
import { MAX_IMPORT_ROWS } from './validateImport';

/**
 * Plantilla de importación (#179, ticket #182): la planilla vacía que el
 * Store admin descarga, completa y vuelve a subir. Columnas fijas del
 * Producto; las de módulos (costo, stock inicial) las suman tickets
 * posteriores según las flags de la Store.
 */
export const TEMPLATE_HEADERS = [
  'nombre',
  'categoría',
  'subcategoría',
  'tipo de venta',
  'precio',
  'imagen_url',
  'activo',
] as const;

export type TemplateFormat = 'xlsx' | 'csv';

export const TEMPLATE_CONTENT_TYPES: Record<TemplateFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

const INSTRUCTIONS = [
  ['Columna', 'Qué poner'],
  ['nombre', 'Obligatoria. Hasta 100 caracteres.'],
  ['categoría', 'Obligatoria. Si no existe en la Store, se avisa en la vista previa y se crea al confirmar.'],
  ['subcategoría', 'Opcional.'],
  ['tipo de venta', 'unidad, 100gr o kg. Si queda vacía, unidad.'],
  ['precio', 'Obligatoria. Número mayor a 0, con coma o punto decimal.'],
  ['imagen_url', 'Opcional. Link que empiece con http:// o https://. Sin imagen se usa una genérica.'],
  ['activo', 'sí o no. Si queda vacía, sí.'],
  ['', ''],
  [`Máximo ${MAX_IMPORT_ROWS} filas por archivo.`, ''],
];

export async function buildImportTemplate(format: TemplateFormat): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Productos');
  sheet.addRow([...TEMPLATE_HEADERS]);

  if (format === 'csv') {
    // `;` y BOM: Excel en español separa por `;` y necesita el BOM para las
    // tildes. El lector de archivos detecta el separador, así que la planilla
    // vuelve a subirse igual.
    const csv = await workbook.csv.writeBuffer({ formatterOptions: { delimiter: ';' } });
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv)]);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 20;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const instructions = workbook.addWorksheet('Instrucciones');
  instructions.addRows(INSTRUCTIONS);
  instructions.getColumn(1).width = 30;
  instructions.getColumn(2).width = 90;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
