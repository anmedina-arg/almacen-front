# Migración de Cloudinary a Supabase Storage

## Contexto

El proyecto usa Cloudinary 100% para almacenamiento de imágenes (`products/` y `categories/`).
Las URLs completas están guardadas en Supabase en:
- Tabla `products` → columna `image`
- Tabla `categories` → columna `image_url`

Next.js ya hace las optimizaciones de imágenes con `unoptimized: false`, por lo que
solo se necesita Supabase Storage como storage + CDN simple, sin transformaciones.

**Deadline: 11 de abril** — la cuenta de Cloudinary será suspendida.

---

## Tareas

### 1. Configurar Supabase Storage
- Crear los buckets necesarios (`products`, `categories` o un bucket unificado `images`)
- Configurar políticas de acceso público para lectura
- Configurar políticas de escritura solo para usuarios autenticados (admin)

### 2. Migrar `useCloudinaryUpload.ts`
- Reemplazarlo por un hook equivalente que suba a Supabase Storage
- Mantener la misma interfaz (mismos parámetros y valores de retorno)
- Soportar las carpetas configurables: `products` (default) y `categories`

### 3. Migrar `getCloudinaryUrl.ts`
- Como Next.js hace las optimizaciones, esta utilidad puede simplificarse o eliminarse
- Evaluar si es necesario mantener alguna transformación o si la URL directa de Supabase es suficiente

### 4. Script de migración de assets existentes
- Descargar todas las imágenes de Cloudinary (`products/` y `categories/`)
- Subirlas a Supabase Storage manteniendo la estructura de carpetas
- Generar un mapping de URLs viejas → nuevas para el paso siguiente

### 5. Script SQL para actualizar la base de datos
- Reemplazar todas las URLs de Cloudinary por las nuevas URLs de Supabase Storage
- Tablas afectadas: `products` (columna `image`) y `categories` (columna `image_url`)

---

## Importante

Arrancá por el análisis y el plan detallado antes de tocar cualquier archivo.
Confirmar el plan antes de ejecutar cualquier migración de datos.
