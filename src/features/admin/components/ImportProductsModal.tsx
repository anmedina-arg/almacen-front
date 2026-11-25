'use client';

import { useState } from 'react';
import { useStoreSlug } from '@/hooks/useStoreSlug';
import {
  MAX_IMPORT_ROWS,
  type ImportPreview,
  type PreviewRow,
  type RowStatus,
} from '@/features/products/import/validateImport';
import { formatPrice } from '@/utils/formatPrice';
import { importApiClient } from '../services/importApiClient';

interface ImportProductsModalProps {
  onClose: () => void;
}

const STATUS_LABEL: Record<RowStatus, string> = {
  valid: 'Válida',
  warning: 'Advertencia',
  error: 'Error',
};

const STATUS_STYLE: Record<RowStatus, string> = {
  valid: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
};


/**
 * Importación masiva de Productos, primera mitad (#182): descarga de la
 * Plantilla, carga del archivo y vista previa. Todavía no crea nada: la
 * confirmación llega en el ticket siguiente.
 */
export function ImportProductsModal({ onClose }: ImportProductsModalProps) {
  const slug = useStoreSlug();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      setPreview(await importApiClient.preview(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo');
    } finally {
      setLoading(false);
    }
  };

  const templateHref = (format: 'xlsx' | 'csv') => `/${slug}/api/products/import/template?format=${format}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Importar productos</h3>
            <p className="text-sm text-gray-500">
              Descargá la plantilla, completala en Excel o Google Sheets y subila como .xlsx o .csv. Máximo {MAX_IMPORT_ROWS}
              filas por archivo.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={templateHref('xlsx')}
            download
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Descargar plantilla (.xlsx)
          </a>
          <a
            href={templateHref('csv')}
            download
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Descargar plantilla (.csv)
          </a>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="import-file">
            Archivo completado
          </label>
          <input
            id="import-file"
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="block w-full text-sm text-gray-600"
          />
          {fileName && <p className="text-xs text-gray-500 mt-1">{fileName}</p>}
        </div>

        {loading && <p className="text-sm text-gray-500">Leyendo el archivo...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {preview?.fileError && <p className="text-sm text-red-600">{preview.fileError}</p>}

        {preview && !preview.fileError && <PreviewSection preview={preview} />}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewSection({ preview }: { preview: ImportPreview }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        <strong>{preview.counts.valid}</strong> válidas · <strong>{preview.counts.warning}</strong> con advertencia ·{' '}
        <strong>{preview.counts.error}</strong> con error. Todavía no se creó ningún producto.
      </p>

      {preview.ignoredColumns.length > 0 && (
        <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3">
          Columnas ignoradas:{' '}
          {preview.ignoredColumns
            .map((c) => `${c.name} (${c.reason === 'module' ? 'módulo no incluido en tu plan' : 'no es de la plantilla'})`)
            .join(', ')}
        </div>
      )}

      {preview.newCategories.length > 0 && (
        <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3">
          Categorías nuevas a confirmar: {preview.newCategories.join(', ')}
        </div>
      )}

      {preview.newSubcategories.length > 0 && (
        <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3">
          Subcategorías nuevas a confirmar:{' '}
          {preview.newSubcategories.map((s) => `${s.name} (en ${s.categoryName})`).join(', ')}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Fila</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2 text-right">Precio</th>
              <th className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <PreviewTableRow key={row.rowNumber} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewTableRow({ row }: { row: PreviewRow }) {
  const { product } = row;
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
      <td className="px-3 py-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
        {row.duplicate && <span className="block text-xs text-gray-500 mt-1">Se omite por defecto</span>}
      </td>
      <td className="px-3 py-2">{product?.name ?? '—'}</td>
      <td className="px-3 py-2">
        {product ? (product.subcategoryName ? `${product.categoryName} / ${product.subcategoryName}` : product.categoryName) : '—'}
      </td>
      <td className="px-3 py-2 text-right">{product ? formatPrice(product.price) : '—'}</td>
      <td className="px-3 py-2 text-gray-600">
        {row.messages.length > 0 ? (
          <ul className="list-disc pl-4 space-y-0.5">
            {row.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          ''
        )}
      </td>
    </tr>
  );
}
