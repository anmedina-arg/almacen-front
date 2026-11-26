'use client';

import { useMemo, useState } from 'react';
import { useStoreSlug } from '@/hooks/useStoreSlug';
import {
  MAX_IMPORT_ROWS,
  type ImportPreview,
  type PreviewRow,
  type RowStatus,
} from '@/features/products/import/validateImport';
import { buildRejectedRowsCsv, planImport, type ImportPlan } from '@/features/products/import/planImport';
import type { ImportResult } from '@/features/products/services/importPreviewService';
import { formatPrice } from '@/utils/formatPrice';
import { useImportProducts } from '../hooks/useImportProducts';
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

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Importación masiva de Productos (#182, #185): descarga de la Plantilla,
 * carga del archivo, vista previa y confirmación. Las categorías nuevas y los
 * posibles duplicados se deciden acá; recién al confirmar se crea algo.
 */
export function ImportProductsModal({ onClose }: ImportProductsModalProps) {
  const slug = useStoreSlug();
  const importMutation = useImportProducts();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includedDuplicates, setIncludedDuplicates] = useState<Set<number>>(new Set());
  const [confirmNewCategories, setConfirmNewCategories] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const selection = useMemo(
    () => ({ includeDuplicateRows: Array.from(includedDuplicates) }),
    [includedDuplicates]
  );
  const plan = useMemo(() => (preview ? planImport(preview, selection) : null), [preview, selection]);
  const needsCategoryConfirmation = plan ? plan.newCategories.length + plan.newSubcategories.length > 0 : false;
  const canConfirm =
    !!plan && plan.products.length > 0 && (!needsCategoryConfirmation || confirmNewCategories) && !importMutation.isPending;

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    setError(null);
    setPreview(null);
    setResult(null);
    setIncludedDuplicates(new Set());
    setConfirmNewCategories(false);
    setLoading(true);
    try {
      setPreview(await importApiClient.preview(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !plan) return;
    setError(null);
    try {
      setResult(await importMutation.mutateAsync({ file, options: { ...selection, confirmNewCategories } }));
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron crear los productos');
    }
  };

  const toggleDuplicate = (rowNumber: number) =>
    setIncludedDuplicates((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });

  const downloadRejected = () => {
    if (preview && plan) downloadCsv(buildRejectedRowsCsv(preview, plan.skipped), 'filas-rechazadas.csv');
  };

  const templateHref = (format: 'xlsx' | 'csv') => `/${slug}/api/products/import/template?format=${format}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Importar productos</h3>
            <p className="text-sm text-gray-500">
              Descargá la plantilla, completala en Excel o Google Sheets y subila como .xlsx o .csv. Máximo{' '}
              {MAX_IMPORT_ROWS} filas por archivo. Solo crea productos nuevos.
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
          {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
        </div>

        {loading && <p className="text-sm text-gray-500">Leyendo el archivo...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {preview?.fileError && <p className="text-sm text-red-600">{preview.fileError}</p>}

        {result && <ResultSection result={result} />}

        {preview && plan && !preview.fileError && (
          <PreviewSection
            preview={preview}
            plan={plan}
            includedDuplicates={includedDuplicates}
            onToggleDuplicate={toggleDuplicate}
            confirmNewCategories={confirmNewCategories}
            onConfirmNewCategories={setConfirmNewCategories}
            needsCategoryConfirmation={needsCategoryConfirmation}
            onDownloadRejected={downloadRejected}
          />
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {preview && plan && !preview.fileError && (
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importMutation.isPending ? 'Creando...' : `Crear ${plan.products.length} producto${plan.products.length === 1 ? '' : 's'}`}
            </button>
          )}
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

function ResultSection({ result }: { result: ImportResult }) {
  return (
    <div className="text-sm bg-green-50 border border-green-200 rounded-md p-3 text-green-900">
      Se crearon <strong>{result.productsCreated}</strong> producto{result.productsCreated === 1 ? '' : 's'}
      {result.categoriesCreated > 0 && <>, {result.categoriesCreated} categoría{result.categoriesCreated === 1 ? '' : 's'}</>}
      {result.subcategoriesCreated > 0 && (
        <>, {result.subcategoriesCreated} subcategoría{result.subcategoriesCreated === 1 ? '' : 's'}</>
      )}
      . Las filas omitidas: {result.skippedCount}.
    </div>
  );
}

interface PreviewSectionProps {
  preview: ImportPreview;
  plan: ImportPlan;
  includedDuplicates: Set<number>;
  onToggleDuplicate: (rowNumber: number) => void;
  confirmNewCategories: boolean;
  onConfirmNewCategories: (value: boolean) => void;
  needsCategoryConfirmation: boolean;
  onDownloadRejected: () => void;
}

/** Las columnas de costo y stock inicial solo se muestran si alguna fila las trae (módulo encendido y celda cargada). */
function moduleColumns(preview: ImportPreview) {
  return {
    showCost: preview.rows.some((row) => row.product?.cost != null),
    showStock: preview.rows.some((row) => row.product?.initialStock != null),
  };
}

function PreviewSection({
  preview,
  plan,
  includedDuplicates,
  onToggleDuplicate,
  confirmNewCategories,
  onConfirmNewCategories,
  needsCategoryConfirmation,
  onDownloadRejected,
}: PreviewSectionProps) {
  const { showCost, showStock } = moduleColumns(preview);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        <strong>{preview.counts.valid}</strong> válidas · <strong>{preview.counts.warning}</strong> con advertencia ·{' '}
        <strong>{preview.counts.error}</strong> con error. Se van a crear <strong>{plan.products.length}</strong>; las
        demás se omiten.
      </p>

      {preview.ignoredColumns.length > 0 && (
        <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3">
          Columnas ignoradas:{' '}
          {preview.ignoredColumns
            .map((c) => `${c.name} (${c.reason === 'module' ? 'módulo no incluido en tu plan' : 'no es de la plantilla'})`)
            .join(', ')}
        </div>
      )}

      {needsCategoryConfirmation && (
        <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2">
          {plan.newCategories.length > 0 && <p>Categorías nuevas: {plan.newCategories.join(', ')}</p>}
          {plan.newSubcategories.length > 0 && (
            <p>Subcategorías nuevas: {plan.newSubcategories.map((s) => `${s.name} (en ${s.categoryName})`).join(', ')}</p>
          )}
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={confirmNewCategories}
              onChange={(e) => onConfirmNewCategories(e.target.checked)}
            />
            Confirmo que se creen. Revisá que no sean errores de tipeo de una categoría que ya existe.
          </label>
        </div>
      )}

      {plan.skipped.length > 0 && (
        <button onClick={onDownloadRejected} className="text-sm text-blue-700 underline">
          Descargar las {plan.skipped.length} filas omitidas con su motivo (.csv)
        </button>
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
              {showCost && <th className="px-3 py-2 text-right">Costo</th>}
              {showStock && <th className="px-3 py-2 text-right">Stock inicial</th>}
              <th className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <PreviewTableRow
                key={row.rowNumber}
                row={row}
                included={includedDuplicates.has(row.rowNumber)}
                onToggleDuplicate={onToggleDuplicate}
                showCost={showCost}
                showStock={showStock}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewTableRow({
  row,
  included,
  onToggleDuplicate,
  showCost,
  showStock,
}: {
  row: PreviewRow;
  included: boolean;
  onToggleDuplicate: (rowNumber: number) => void;
  showCost: boolean;
  showStock: boolean;
}) {
  const { product } = row;
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
      <td className="px-3 py-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
        {row.duplicate && (
          <label className="flex items-center gap-1 text-xs text-gray-600 mt-1">
            <input type="checkbox" checked={included} onChange={() => onToggleDuplicate(row.rowNumber)} />
            Crear igual
          </label>
        )}
      </td>
      <td className="px-3 py-2">{product?.name ?? '—'}</td>
      <td className="px-3 py-2">
        {product ? (product.subcategoryName ? `${product.categoryName} / ${product.subcategoryName}` : product.categoryName) : '—'}
      </td>
      <td className="px-3 py-2 text-right">{product ? formatPrice(product.price) : '—'}</td>
      {showCost && (
        <td className="px-3 py-2 text-right">{product?.cost != null ? formatPrice(product.cost) : '—'}</td>
      )}
      {showStock && <td className="px-3 py-2 text-right">{product?.initialStock ?? '—'}</td>}
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
