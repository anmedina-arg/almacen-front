/**
 * Número de WhatsApp propio de la Store si está configurado en DB, si no
 * NEXT_PUBLIC_WHATSAPP_NUMBER como fallback (Stores sin número propio
 * cargado, ver supabase_store_whatsapp.sql). Server-side únicamente: el
 * resultado baja como prop hasta openWhatsApp, que necesita el número ya
 * resuelto de forma síncrona en el gesto de click (ver messageUtils.ts).
 */
export function resolveWhatsappNumber(storeWhatsappNumber: string | null): string {
  return storeWhatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491112345678';
}
