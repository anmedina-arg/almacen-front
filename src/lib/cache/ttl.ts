/**
 * TTLs (en segundos) para piezas de cache que se invalidan por tiempo, no
 * por evento (#147, spec #139) — el resto del sistema de cache (metadata
 * #145, stock #146) invalida vía revalidateTag; esta es la única pieza
 * que se deja expirar sola a propósito (badge "más vendido", ventana de
 * 30 días que no necesita estar al minuto — ver fetchTopSellerIds.ts).
 */
export const TOP_SELLER_CACHE_SECONDS = 60 * 60 * 24;
