'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCreateProduct } from '../hooks/useCreateProduct';
import { useUpdateProduct } from '../hooks/useUpdateProduct';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useComboComponents } from '../hooks/useComboComponents';
import { useUpdateComboComponents } from '../hooks/useUpdateComboComponents';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { useCategories } from '../hooks/useCategories';
import { ImageUploadField } from './ImageUploadField';
import type { Product } from '@/types';
import type { ComboComponent } from '../types/combo.types';

interface ComboFormModalProps {
  mode: 'create' | 'edit';
  product?: Product;
  onClose: () => void;
}

export function ComboFormModal({ mode, product, onClose }: ComboFormModalProps) {
  const createMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const updateComponentsMutation = useUpdateComboComponents();
  const { data: allProducts = [] } = useAdminProducts();
  const { data: existingComponents = [] } = useComboComponents(
    mode === 'edit' && product ? product.id : null
  );
  const { uploadFile, uploading, uploadError } = useCloudinaryUpload();
  const { data: categories = [] } = useCategories();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [componentSearch, setComponentSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    product?.category_id ?? null
  );

  const [formData, setFormData] = useState({
    name: product?.name ?? '',
    price: product?.price ?? 0,
    image: product?.image ?? '',
    active: product?.active ?? true,
    max_stock: product?.max_stock ?? null as number | null,
    category_id: product?.category_id ?? null as number | null,
    subcategory_id: product?.subcategory_id ?? null as number | null,
  });

  const [components, setComponents] = useState<ComboComponent[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync components when existingComponents loads (edit mode async)
  useEffect(() => {
    if (mode === 'edit' && existingComponents.length > 0) {
      setComponents(existingComponents);
    }
  }, [existingComponents, mode]);

  // Products available as components (non-combo, active, not the combo itself)
  const availableProducts = useMemo(
    () => allProducts.filter((p) => !p.is_combo && p.active && p.id !== product?.id),
    [allProducts, product?.id]
  );

  const filteredAvailableProducts = useMemo(
    () =>
      availableProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(componentSearch.toLowerCase()) &&
          !components.some((c) => c.component_product_id === p.id)
      ),
    [availableProducts, componentSearch, components]
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  // Real-time cost from components
  const calculatedCost = useMemo(
    () =>
      components.reduce((sum, comp) => {
        const prod = allProducts.find((p) => p.id === comp.component_product_id);
        return sum + comp.quantity * (prod?.cost ?? 0);
      }, 0),
    [components, allProducts]
  );

  // Suggested price: sum of component sale prices × quantities
  const suggestedPrice = useMemo(
    () =>
      components.reduce((sum, comp) => {
        const prod = allProducts.find((p) => p.id === comp.component_product_id);
        return sum + comp.quantity * (prod?.price ?? 0);
      }, 0),
    [components, allProducts]
  );

  const margin = formData.price - calculatedCost;

  const addComponent = (productId: number) => {
    setComponents((prev) => [...prev, { component_product_id: productId, quantity: 1 }]);
    setComponentSearch('');
  };

  const removeComponent = (productId: number) => {
    setComponents((prev) => prev.filter((c) => c.component_product_id !== productId));
  };

  const updateComponentQuantity = (productId: number, quantity: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.component_product_id === productId ? { ...c, quantity } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
    if (formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';
    if (components.length === 0) newErrors.components = 'Debe agregar al menos un componente';
    if (!formData.image && !pendingFile) newErrors.image = 'Imagen requerida';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    let finalImage = formData.image;
    if (pendingFile) {
      try {
        finalImage = await uploadFile(pendingFile);
      } catch {
        return;
      }
    }

    const componentPayload = components
      .filter((c) => c.quantity > 0)
      .map((c) => ({ component_product_id: c.component_product_id, quantity: c.quantity }));

    const productPayload = {
      name: formData.name.trim(),
      price: formData.price,
      cost: calculatedCost,
      image: finalImage,
      active: formData.active,
      mainCategory: 'combos' as const,
      categories: 'combos',
      sale_type: 'unit' as const,
      is_combo: true,
      max_stock: formData.max_stock,
      category_id: formData.category_id,
      subcategory_id: formData.subcategory_id,
    };

    if (mode === 'create') {
      createMutation.mutate(productPayload as Parameters<typeof createMutation.mutate>[0], {
        onSuccess: (newProduct) => {
          updateComponentsMutation.mutate(
            { productId: newProduct.id, components: componentPayload },
            { onSuccess: () => onClose() }
          );
        },
      });
    } else if (product) {
      updateProductMutation.mutate(
        { id: product.id, updates: productPayload as Partial<Product> },
        {
          onSuccess: () => {
            updateComponentsMutation.mutate(
              { productId: product.id, components: componentPayload },
              { onSuccess: () => onClose() }
            );
          },
        }
      );
    }
  };

  const isPending =
    createMutation.isPending ||
    updateProductMutation.isPending ||
    updateComponentsMutation.isPending ||
    uploading;

  const mutationError =
    createMutation.error || updateProductMutation.error || updateComponentsMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? 'Nuevo Combo' : 'Editar Combo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del combo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio de venta *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>

          {/* Costo, precio sugerido y margen */}
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm space-y-1">
            <p className="text-gray-600">
              Costo calculado:{' '}
              <span className="font-semibold text-gray-800">${calculatedCost.toFixed(2)}</span>
            </p>
            {components.length > 0 && (
              <p className="text-gray-600">
                Precio sugerido:{' '}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, price: suggestedPrice }))}
                  className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                  title="Usar como precio de venta"
                >
                  ${suggestedPrice.toFixed(2)}
                </button>
                <span className="text-gray-400 ml-1 text-xs">(suma de precios de componentes)</span>
              </p>
            )}
            <p className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Margen: ${margin.toFixed(2)}
            </p>
          </div>

          {/* Imagen */}
          <ImageUploadField
            currentImageUrl={formData.image || undefined}
            onFileChange={(file) => setPendingFile(file)}
            disabled={isPending}
            error={uploadError ?? errors.image}
          />

          {/* Stock máximo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock máximo (opcional)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={formData.max_stock ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_stock: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="Sin límite"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
          </div>

          {/* Activo */}
          <div className="flex items-center gap-2">
            <input
              id="combo-active"
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isPending}
            />
            <label htmlFor="combo-active" className="text-sm font-medium text-gray-700">
              Combo activo
            </label>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedCategoryId(val);
                setFormData({ ...formData, category_id: val, subcategory_id: null });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={isPending}
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategoría
            </label>
            <select
              value={formData.subcategory_id ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setFormData({ ...formData, subcategory_id: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isPending || !selectedCategory || selectedCategory.subcategories.length === 0}
            >
              <option value="">Sin subcategoría</option>
              {selectedCategory?.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          {/* Sección componentes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Componentes del combo
            </h3>
            {errors.components && (
              <p className="text-sm text-red-600">{errors.components}</p>
            )}

            {/* Lista de componentes actuales */}
            {components.length > 0 && (
              <div className="space-y-2">
                {components.map((comp) => {
                  const prod = allProducts.find((p) => p.id === comp.component_product_id);
                  const compCost = (prod?.cost ?? 0) * comp.quantity;
                  return (
                    <div
                      key={comp.component_product_id}
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-gray-800 truncate font-medium">
                        {prod?.name ?? `Producto #${comp.component_product_id}`}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        costo: ${compCost.toFixed(2)}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={comp.quantity}
                        onChange={(e) =>
                          updateComponentQuantity(
                            comp.component_product_id,
                            parseFloat(e.target.value) || 1
                          )
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isPending}
                        aria-label={`Cantidad de ${prod?.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeComponent(comp.component_product_id)}
                        className="text-red-400 hover:text-red-600 transition-colors text-xl font-bold leading-none flex-shrink-0"
                        disabled={isPending}
                        aria-label={`Quitar ${prod?.name}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buscador para agregar componentes */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar producto para agregar al combo..."
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
              />
              {componentSearch && filteredAvailableProducts.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-lg">
                  {filteredAvailableProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addComponent(p.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      disabled={isPending}
                    >
                      <span className="font-medium text-gray-800">{p.name}</span>
                      {p.cost != null && Number(p.cost) > 0 && (
                        <span className="text-gray-400 ml-2 text-xs">
                          costo: ${Number(p.cost).toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {componentSearch && filteredAvailableProducts.length === 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 border border-gray-200 rounded-md bg-white shadow-lg">
                  <p className="px-3 py-2 text-sm text-gray-500">Sin resultados</p>
                </div>
              )}
            </div>
          </div>

          {/* Error general */}
          {mutationError && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{(mutationError as Error).message}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {uploading
                ? 'Subiendo imagen...'
                : isPending
                ? 'Guardando...'
                : mode === 'create'
                ? 'Crear Combo'
                : 'Actualizar Combo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
