'use client';

import { useState, useEffect } from 'react';
import { useCreateProduct } from '../hooks/useCreateProduct';
import { useUpdateProduct } from '../hooks/useUpdateProduct';
import { productCreateSchema } from '../schemas/productCreateSchema';
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

  const [formData, setFormData] = useState<ProductCreateInput>({
    name: product?.name || '',
    price: product?.price || 0,
    image: product?.image || '',
    mainCategory: product?.mainCategory || 'almacen',
    categories: product?.categories || '',
    active: product?.active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar formData cuando el producto cambia (importante para modo edit)
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price,
        image: product.image,
        mainCategory: product.mainCategory,
        categories: product.categories,
        active: product.active,
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar con Zod
    const result = productCreateSchema.safeParse(formData);

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

  const isPending = createMutation.isPending || updateMutation.isPending;
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

          {/* Imagen URL */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
              URL de imagen (Cloudinary) *
            </label>
            <input
              id="image"
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isPending}
              placeholder="https://res.cloudinary.com/..."
            />
            {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
          </div>

          {/* Categoría Principal */}
          <div>
            <label htmlFor="mainCategory" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría principal *
            </label>
            <select
              id="mainCategory"
              value={formData.mainCategory}
              onChange={(e) => setFormData({ ...formData, mainCategory: e.target.value as ProductCreateInput['mainCategory'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              disabled={isPending}
            >
              <option value="almacen">Almacén</option>
              <option value="bebidas">Bebidas</option>
              <option value="snaks">Snacks</option>
              <option value="lacteos">Lácteos</option>
              <option value="panaderia">Panadería</option>
              <option value="congelados">Congelados</option>
              <option value="fiambres">Fiambres</option>
              <option value="pizzas">Pizzas</option>
              <option value="combos">Combos</option>
              <option value="otros">Otros</option>
            </select>
            {errors.mainCategory && <p className="mt-1 text-sm text-red-600">{errors.mainCategory}</p>}
          </div>

          {/* Categorías adicionales */}
          <div>
            <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-1">
              Categorías adicionales (separadas por coma)
            </label>
            <input
              id="categories"
              type="text"
              value={formData.categories}
              onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
              placeholder="categoria1, categoria2, categoria3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isPending}
            />
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
              {isPending ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
