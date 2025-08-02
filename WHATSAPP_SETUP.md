# Configuración del Botón de WhatsApp

## Variables de Entorno

Para que el botón flotante de WhatsApp funcione correctamente, necesitas configurar una variable de entorno.

### 1. Crear archivo .env.local

En la raíz de tu proyecto, crea un archivo llamado `.env.local` con el siguiente contenido:

```env
NEXT_PUBLIC_WHATSAPP_NUMBER=5491112345678
```

### 2. Formato del número

El número debe estar en el siguiente formato:

- **Código de país**: Sin el símbolo `+` (ej: `54` para Argentina)
- **Número completo**: Sin espacios, guiones ni paréntesis
- **Ejemplo**: `5491112345678` (Argentina, número 911-1234-5678)

### 3. Configuración en producción

Si estás usando Vercel, Netlify u otra plataforma de hosting:

#### Vercel:

1. Ve a tu dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a "Settings" → "Environment Variables"
4. Agrega:
   - **Name**: `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - **Value**: Tu número de WhatsApp (ej: `5491112345678`)
   - **Environment**: Production, Preview, Development

#### Netlify:

1. Ve a tu dashboard de Netlify
2. Selecciona tu sitio
3. Ve a "Site settings" → "Environment variables"
4. Agrega la variable con el mismo formato

### 4. Verificación

Después de configurar la variable de entorno:

1. Reinicia tu servidor de desarrollo (`npm run dev`)
2. El botón flotante verde aparecerá en la esquina inferior derecha
3. Al hacer clic, se abrirá WhatsApp con un mensaje predefinido

### 5. Personalización

Puedes modificar el mensaje predeterminado editando la función `openWhatsApp` en `src/app/page.tsx`:

```typescript
const message = encodeURIComponent('Tu mensaje personalizado aquí');
```

## Notas importantes

- El archivo `.env.local` está en `.gitignore` por seguridad
- La variable debe comenzar con `NEXT_PUBLIC_` para ser accesible en el cliente
- Si no se configura la variable, se usará un número por defecto
