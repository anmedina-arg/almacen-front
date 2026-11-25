import { describe, expect, it } from 'vitest';
import { getImageHostRules, isAllowedImageUrl } from './imageHosts';

// Hosts desde los que next/image puede mostrar imágenes remotas. next.config.ts
// arma sus remotePatterns con esta misma lista, y la Importación masiva la usa
// para rechazar una imagen_url que rompería el catálogo (#185).
const env = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co',
  NEXT_PUBLIC_IMAGE_STORAGE_URL: 'https://otro.supabase.co',
};
const rules = getImageHostRules(env);

describe('isAllowedImageUrl', () => {
  it.each([
    'https://proyecto.supabase.co/storage/v1/object/public/productos/a.jpg',
    'https://otro.supabase.co/storage/v1/object/public/productos/a.jpg',
    'https://res.cloudinary.com/demo/image/upload/a.jpg',
    'https://lh3.googleusercontent.com/abc123',
  ])('acepta %s', (url) => {
    expect(isAllowedImageUrl(url, rules)).toBe(true);
  });

  it.each([
    ['un host que no está en la lista', 'https://example.com/a.jpg'],
    ['http sin cifrar', 'http://res.cloudinary.com/demo/a.jpg'],
    ['el host de Supabase pero fuera de storage público', 'https://proyecto.supabase.co/rest/v1/products'],
    ['un host que solo termina igual', 'https://evil-res.cloudinary.com.example.com/a.jpg'],
    ['un texto que no es una URL', 'foto.jpg'],
  ])('rechaza %s', (_motivo, url) => {
    expect(isAllowedImageUrl(url, rules)).toBe(false);
  });

  it('sin la URL de Supabase configurada acepta cualquier *.supabase.co, como next.config', () => {
    const open = getImageHostRules({});
    expect(isAllowedImageUrl('https://cualquiera.supabase.co/storage/v1/object/public/a.jpg', open)).toBe(true);
    expect(isAllowedImageUrl('https://example.com/a.jpg', open)).toBe(false);
  });
});
