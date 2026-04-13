/**
 * Returns the URL as-is. Kept for backward compatibility during migration.
 * Next.js <Image> handles optimization for Supabase Storage URLs.
 * Cloudinary URLs (legacy, still in DB) are served unmodified until the SQL migration runs.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCloudinaryUrl(url: string, _width: number): string {
  return url;
}
