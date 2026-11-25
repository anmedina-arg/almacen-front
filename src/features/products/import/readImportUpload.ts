import { ValidationError } from '@/lib/api/errors';
import { MAX_IMPORT_FILE_BYTES } from './parseImportFile';

/** El archivo subido en el campo `file` de un multipart, ya leído y con su tamaño verificado. */
export async function readImportUpload(form: FormData): Promise<{ buffer: Buffer; filename: string }> {
  const file = form.get('file');
  if (!(file instanceof File)) throw new ValidationError('Falta el archivo');
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ValidationError(`El archivo pesa más de ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB: dividilo en partes`);
  }
  return { buffer: Buffer.from(await file.arrayBuffer()), filename: file.name };
}
