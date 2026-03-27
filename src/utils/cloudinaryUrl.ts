/**
 * Inserts Cloudinary transformation params into an existing Cloudinary URL.
 * Works for both new uploads and images already stored without transformations.
 *
 * Input:  https://res.cloudinary.com/xxx/image/upload/v123/products/img.jpg
 * Output: https://res.cloudinary.com/xxx/image/upload/f_auto,q_auto,w_400/v123/products/img.jpg
 *
 * If the URL is not from Cloudinary, returns it unchanged.
 */
export function getCloudinaryUrl(url: string, width: number): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  // Avoid inserting transformations twice
  if (url.includes('f_auto') || url.includes('q_auto')) return url;

  return url.replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto,w_${width}/`
  );
}
