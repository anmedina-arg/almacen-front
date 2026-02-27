'use client';

import { useState, useEffect } from 'react';
import { useCreateProduct } from '../hooks/useCreateProduct';
import { useUpdateProduct } from '../hooks/useUpdateProduct';
import { useCategories } from '../hooks/useCategories';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { productCreateSchema } from '../schemas/productCreateSchema';
import { ImageUploadField } from './ImageUploadField';
import type { Product } from '@/types';
import type { ProductCreateInput } from '../schemas/productCreateSchema';

interface ProductFormModalProps {
  mode: 'create' | 'edit';
  product?: Product;
  onClose: () => void;
}

export function ProductFormModal({ mode, product, onClose }: ProductFormModalProps) {
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: categories = [] } = useCategories();
  const { uploadFile, uploading, uploadError } = useCloudinaryUpload();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(product?.category_id ?? null);

  const [formData, setFormData] = useState<ProductCreateInput>({
    name: product?.name || '',
    price: product?.price || 0,
    image: product?.image || '',
    mainCategory: product?.mainCategory || 'otros',
    categories: product?.categories || '',
    active: product?.active ?? true,
    sale_type: product?.sale_type || 'unit',
    category_id: product?.category_id ?? null,
    subcategory_id: product?.subcategory_id ?? null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar formData cuando el producto cambia (importante para modo edit)
  useEffect(() => {
    if (product) {
      setSelectedCategoryId(product.category_id ?? null);
      setFormData({
        name: product.name,
        price: product.price,
        image: product.image,
        mainCategory: product.mainCategory || 'otros',
        categories: product.categories,
        active: product.active,
        sale_type: product.sale_type,
        category_id: product.category_id ?? null,
        subcategory_id: product.subcategory_id ?? null,
      });
    }
  }, [product]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si hay archivo pendiente, subirlo primero y actualizar formData con la URL
    let finalFormData = formData;
    if (pendingFile) {
      try {
        const imageUrl = await uploadFile(pendingFile);
        finalFormData = { ...formData, image: imageUrl };
      } catch {
        // uploadError ya está seteado en el hook
        return;
      }
    }

    // Validar con Zod
    const result = productCreateSchema.safeParse(finalFormData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    if (mode === 'create') {
      createMutation.mutate(result.data, {
        onSuccess: () => onClose(),
      });
    } else if (product) {
      updateMutation.mutate(
        { id: product.id, updates: result.data },
        { onSuccess: () => onClose() }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || uploading;
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? 'Crear Producto' : 'Editar Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isPending}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Precio */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Precio *
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isPending}
            />
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>

          {/* Imagen */}
          <ImageUploadField
            currentImageUrl={formData.image || undefined}
            onFileChange={(file) => setPendingFile(file)}
            disabled={isPending}
            error={uploadError ?? errors.image}
          />

          {/* Categoría (dinámica) */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="category_id"
              value={selectedCategoryId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedCategoryId(val);
                setFormData({ ...formData, category_id: val, subcategory_id: null });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              disabled={isPending}
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategoría (dinámica) */}
          <div>
            <label htmlFor="subcategory_id" className="block text-sm font-medium text-gray-700 mb-1">
              Subcategoría
            </label>
            <select
              id="subcategory_id"
              value={formData.subcategory_id ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setFormData({ ...formData, subcategory_id: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isPending || !selectedCategory || selectedCategory.subcategories.length === 0}
            >
              <option value="">Sin subcategoría</option>
              {selectedCategory?.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo de venta */}
          <div>
            <label htmlFor="sale_type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de venta *
            </label>
            <select
              id="sale_type"
              value={formData.sale_type}
              onChange={(e) => setFormData({ ...formData, sale_type: e.target.value as ProductCreateInput['sale_type'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              disabled={isPending}
            >
              <option value="unit">Por unidad</option>
              <option value="100gr">Por 100 gramos</option>
              <option value="kg">Por kilo</option>
            </select>
            {errors.sale_type && <p className="mt-1 text-sm text-red-600">{errors.sale_type}</p>}
          </div>

          {/* Estado activo */}
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              disabled={isPending}
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Producto activo
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{(error as Error).message}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {uploading ? 'Subiendo imagen...' : isPending ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
