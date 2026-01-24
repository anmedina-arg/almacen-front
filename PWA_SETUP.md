# Configuración de PWA (Progressive Web App)

## Resumen

Esta aplicación ha sido configurada como una Progressive Web App (PWA), lo que permite:

- **Instalación en el dispositivo**: Los usuarios pueden instalar la app en sus dispositivos móviles y de escritorio
- **Funcionamiento offline**: La app funciona sin conexión a internet gracias al Service Worker
- **Experiencia nativa**: Se comporta como una aplicación nativa cuando se instala
- **Actualizaciones automáticas**: El Service Worker gestiona las actualizaciones de la aplicación

## Archivos Configurados

### 1. Manifest (`public/manifest.json`)
Define los metadatos de la PWA:
- Nombre de la aplicación: "Market del Cevil"
- Iconos en múltiples tamaños (192x192, 512x512)
- Modo de visualización: standalone
- Color de tema: negro (#000000)
- Orientación: portrait-primary

### 2. Service Worker (`public/sw.js`)
Gestiona el caché y funcionalidad offline:
- Cachea recursos esenciales durante la instalación
- Implementa estrategia cache-first para mejor rendimiento
- Limpia cachés antiguos automáticamente
- Maneja actualizaciones de la aplicación

### 3. Iconos Generados
Se han generado automáticamente los siguientes iconos:
- `icon-192.png` - Icono estándar 192x192
- `icon-512.png` - Icono estándar 512x512
- `icon-192-maskable.png` - Icono adaptable 192x192
- `icon-512-maskable.png` - Icono adaptable 512x512
- `apple-touch-icon.png` - Icono para iOS (180x180)
- `favicon.ico` - Favicon (32x32)

### 4. Componente de Registro (`src/components/ServiceWorkerRegistration.tsx`)
Registra el Service Worker automáticamente:
- Se ejecuta cuando la aplicación carga
- Detecta actualizaciones cada minuto
- Notifica al usuario cuando hay una nueva versión disponible
- Gestiona la recarga automática tras actualización

### 5. Layout Actualizado (`src/app/layout.tsx`)
Incluye meta tags necesarios para PWA:
- Link al manifest
- Meta tags para móviles (iOS y Android)
- Configuración de color de tema
- Links a iconos

### 6. Configuración de Next.js (`next.config.ts`)
Headers optimizados:
- Cache del Service Worker con revalidación
- Cache del manifest inmutable
- Permisos correctos para el Service Worker

## Cómo Probar la PWA

### En Desarrollo Local

1. **Iniciar el servidor de producción**:
   ```bash
   npm run build
   npm start
   ```

2. **Abrir en el navegador**:
   - Chrome/Edge: `http://localhost:3000`
   - Abre DevTools > Application > Manifest
   - Verifica que el manifest se cargue correctamente
   - En "Service Workers", verifica que el SW esté registrado

3. **Probar instalación**:
   - En Chrome/Edge, verás un icono "+" en la barra de direcciones
   - Click para instalar la PWA
   - La aplicación se abrirá en una ventana independiente

### En Móvil (Android)

1. Abre la URL en Chrome
2. Menú > "Agregar a pantalla de inicio"
3. La app se instalará como una aplicación nativa

### En Móvil (iOS)

1. Abre la URL en Safari
2. Botón de compartir > "Agregar a la pantalla de inicio"
3. La app aparecerá en la pantalla de inicio

### Probar Funcionalidad Offline

1. Con la aplicación abierta:
   - Abre DevTools > Network
   - Marca "Offline"
   - Recarga la página
   - La aplicación debería funcionar desde el caché

## Lighthouse Audit

Para verificar la calidad de la PWA:

1. Abre Chrome DevTools
2. Ve a la pestaña "Lighthouse"
3. Selecciona "Progressive Web App"
4. Click en "Analyze page load"

La aplicación debería obtener una puntuación alta en:
- PWA score
- Performance
- Accessibility
- Best Practices

## Personalización

### Cambiar Colores de Tema

Edita `public/manifest.json`:
```json
{
  "background_color": "#ffffff",
  "theme_color": "#000000"
}
```

También actualiza en `src/app/layout.tsx`:
```html
<meta name="theme-color" content="#000000" />
```

### Actualizar Iconos

1. Reemplaza `public/logo-og.png` con tu logo
2. Ejecuta: `node scripts/generate-icons.js`
3. Los iconos se regenerarán automáticamente

### Modificar Estrategia de Caché

Edita `public/sw.js` para cambiar:
- Recursos a pre-cachear en `PRECACHE_URLS`
- Estrategia de caché en el evento `fetch`
- Nombre y versión del caché en `CACHE_NAME`

## Deployment

### Vercel / Netlify
La PWA funcionará automáticamente. Asegúrate de que:
- Los archivos en `public/` se sirvan correctamente
- Los headers HTTP estén configurados (ya incluidos en `next.config.ts`)

### Servidor Propio
Asegúrate de:
- Servir la app sobre HTTPS (requerido para Service Workers)
- Configurar headers correctos para `sw.js` y `manifest.json`
- Permitir que `sw.js` tenga scope sobre toda la app

## Actualizaciones

Cuando despliegues una nueva versión:

1. Incrementa la versión en `public/sw.js`:
   ```javascript
   const CACHE_NAME = 'market-cevil-v2'; // Incrementa el número
   ```

2. El Service Worker detectará el cambio
3. Los usuarios verán un prompt para actualizar
4. Al aceptar, la nueva versión se instalará

## Troubleshooting

### El Service Worker no se registra
- Verifica que estés usando HTTPS o localhost
- Revisa la consola del navegador para errores
- Asegúrate de que `sw.js` esté en la carpeta `public/`

### El manifest no se detecta
- Verifica que `manifest.json` esté en `public/`
- Revisa DevTools > Application > Manifest
- Verifica que el link en `layout.tsx` sea correcto

### La app no funciona offline
- Verifica que el Service Worker esté activo
- Revisa qué recursos están cacheados en DevTools > Application > Cache Storage
- Asegúrate de que los recursos necesarios estén en `PRECACHE_URLS`

## Recursos Adicionales

- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google - Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers)
