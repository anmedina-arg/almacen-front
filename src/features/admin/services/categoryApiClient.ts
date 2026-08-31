import type {
  Category,
  CategoryWithSubcategories,
  Subcategory,
} from '../types/category.types';
import type { CategoryInput } from '@/features/products/schemas/categorySchemas';
import { apiFetch } from '@/lib/api/apiFetch';

/**
 * Cliente HTTP para Client Components — pasa por /api/categories/*, a
 * diferencia del service del dominio (features/products/services/
 * categoryService.ts) que llama a Supabase directo y también lo usan los
 * Server Components sin pasar por HTTP (ver ADR-0013 / ticket #107).
 * Antes se llamaba categoryService — renombrado para no confundir las dos
 * capas (mismo nombre, responsabilidades distintas).
 */
export const categoryApiClient = {
  async getAll(): Promise<Category[]> {
    const res = await apiFetch('/categories', { cache: 'no-store' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener categorías');
    }
    return res.json();
  },

  async getAllWithSubcategories(): Promise<CategoryWithSubcategories[]> {
    const res = await apiFetch('/categories?include=subcategories', { cache: 'no-store' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener categorías');
    }
    return res.json();
  },

  async create(data: CategoryInput): Promise<Category> {
    const res = await apiFetch('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al crear la categoría');
    }
    return res.json();
  },

  async update(id: number, data: CategoryInput): Promise<Category> {
    const res = await apiFetch(`/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar la categoría');
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar la categoría');
    }
  },

  async createSubcategory(categoryId: number, name: string): Promise<Subcategory> {
    const res = await apiFetch(`/categories/${categoryId}/subcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al crear la subcategoría');
    }
    return res.json();
  },

  async updateSubcategory(id: number, name: string): Promise<Subcategory> {
    const res = await apiFetch(`/subcategories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar la subcategoría');
    }
    return res.json();
  },

  async deleteSubcategory(id: number): Promise<void> {
    const res = await apiFetch(`/subcategories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar la subcategoría');
    }
  },
};
