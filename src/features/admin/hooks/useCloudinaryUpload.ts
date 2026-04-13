import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface UseStorageUploadOptions {
  folder?: string;
}

export function useCloudinaryUpload({ folder = 'products' }: UseStorageUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<string> {
    setUploading(true);
    setUploadError(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${filename}`;

      const { error } = await supabaseBrowser.storage
        .from(folder)
        .upload(path, file, { upsert: false, cacheControl: '31536000' });

      if (error) throw new Error(error.message);

      const { data } = supabaseBrowser.storage.from(folder).getPublicUrl(path);
      return data.publicUrl;

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
