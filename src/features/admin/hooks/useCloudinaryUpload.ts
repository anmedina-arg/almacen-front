import { useState } from 'react';

interface UseCloudinaryUploadOptions {
  folder?: string;
}

export function useCloudinaryUpload({ folder = 'products' }: UseCloudinaryUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<string> {
    setUploading(true);
    setUploadError(null);

    try {
      const timestamp = Math.round(Date.now() / 1000);

      // 1. Pedir firma al backend
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, folder }),
      });

      if (!signRes.ok) {
        throw new Error('Error al generar firma de Cloudinary');
      }

      const { signature, api_key, cloud_name } = await signRes.json() as {
        signature: string;
        timestamp: number;
        api_key: string;
        cloud_name: string;
      };

      // 2. Subir archivo a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!uploadRes.ok) {
        throw new Error('Error al subir la imagen a Cloudinary');
      }

      const data = await uploadRes.json() as { secure_url: string };
      return data.secure_url;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al subir imagen';
      setUploadError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }

  return { uploadFile, uploading, uploadError };
}
