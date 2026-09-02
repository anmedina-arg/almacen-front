import type { Familia, FamiliaWithVariedades, Variedad } from '../types/familia.types';
import type { FamiliaInput } from '@/features/products/schemas/familiaSchemas';
import { apiFetch, extractErrorMessage } from '@/lib/api/apiFetch';

export const familiaApiClient = {
  async getAllWithVariedades(): Promise<FamiliaWithVariedades[]> {
    const res = await apiFetch('/familias?include=variedades', { cache: 'no-store' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Error al obtener familias'));
    }
    return res.json();
  },

  async create(data: FamiliaInput): Promise<Familia> {
    const res = await apiFetch('/familias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Error al crear la familia'));
    }
    return res.json();
  },

  async update(id: number, data: FamiliaInput): Promise<Familia> {
    const res = await apiFetch(`/familias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Error al actualizar la familia'));
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await apiFetch(`/familias/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Error al eliminar la familia'));
    }
  },

  async createVariedad(familiaId: number, name: string): Promise<Variedad> {
    const res = await apiFetch(`/familias/${familiaId}/variedades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Error al crear la variedad'));
    }
    return res.json();
  },

  async updateVariedad(id: number, data: { name?: string; active?: boolean }): Promise<Variedad> {
    const res = await apiFetch(`/variedades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Error al actualizar la variedad'));
    }
    return res.json();
  },
};
