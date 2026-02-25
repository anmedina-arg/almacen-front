import type {
  Category,
  CategoryWithSubcategories,
  Subcategory,
} from '../types/category.types';
import type { CategoryInput } from '../schemas/categorySchemas';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener categorías');
    }
    return res.json();
  },

  async getAllWithSubcategories(): Promise<CategoryWithSubcategories[]> {
    const res = await fetch('/api/categories?include=subcategories', { cache: 'no-store' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener categorías');
    }
    return res.json();
  },

  async create(data: CategoryInput): Promise<Category> {
    const res = await fetch('/api/categories', {
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
    const res = await fetch(`/api/categories/${id}`, {
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
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar la categoría');
    }
  },

  async createSubcategory(categoryId: number, name: string): Promise<Subcategory> {
    const res = await fetch(`/api/categories/${categoryId}/subcategories`, {
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
    const res = await fetch(`/api/subcategories/${id}`, {
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
    const res = await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar la subcategoría');
    }
  },
};
