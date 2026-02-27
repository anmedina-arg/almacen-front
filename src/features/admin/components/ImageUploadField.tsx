'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface ImageUploadFieldProps {
  currentImageUrl?: string;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
}

export function ImageUploadField({
  currentImageUrl,
  onFileChange,
  disabled = false,
  error,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const displayImage = preview ?? currentImageUrl ?? null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // Preview local inmediato (sin subir nada aún)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onFileChange(file);
  }

  function handleRemove() {
    setPreview(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Imagen del producto *
      </label>

      {/* Preview */}
      {displayImage && (
        <div className="relative w-full h-48 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
          <Image
            src={displayImage}
            alt="Preview del producto"
            fill
            className="object-contain"
            unoptimized={preview !== null} // blob URLs no pasan por next/image optimizer
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-500 hover:text-red-600 transition-colors text-sm font-bold"
              title="Quitar imagen"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Botón de selección */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        id="image-upload-input"
      />
      <label
        htmlFor="image-upload-input"
        className={`
          flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md border
          text-sm font-medium transition-colors cursor-pointer
          ${disabled
            ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }
        `}
      >
        <span>📷</span>
        <span>{displayImage ? 'Cambiar imagen' : 'Elegir imagen'}</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
