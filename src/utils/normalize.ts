// Normalizador: quita tildes/diacríticos, lower-case y caracteres no alfanuméricos
export const normalize = (s?: string) =>
  (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD') // descompone caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // elimina marcas diacríticas
    .replace(/[^a-z0-9\s]/g, '') // elimina caracteres especiales
    .trim();
