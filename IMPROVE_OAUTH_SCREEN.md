# Mejorar Pantalla de Permisos de Google OAuth

## Problema Actual
La URL de callback de Supabase (`https://ihmrrregqddtiyospypm.supabase.co/...`) aparece durante el flujo OAuth, generando desconfianza.

## Solución Rápida (15 minutos)

### 1. Preparar Logo
- Tamaño mínimo: 120x120px
- Formato: PNG con fondo transparente
- El logo actual: https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png

### 2. Mejorar OAuth Consent Screen

1. **Google Cloud Console** → OAuth consent screen → **EDIT APP**

2. **App information:**
   - App logo: Sube el logo de Market del Cevil
   - App name: `Market del Cevil` ✅ (ya está)
   - User support email: tu email ✅ (ya está)

3. **App domain:**
   - Application home page: `https://market-del-cevil.vercel.app` ✅ (ya está)
   - Privacy policy link: `https://market-del-cevil.vercel.app/privacy`
   - Terms of service link: `https://market-del-cevil.vercel.app/terms`

4. **Authorized domains:**
   - Click "+ ADD DOMAIN"
   - Agrega: `market-del-cevil.vercel.app`
   - Agrega: `supabase.co` (para permitir el callback)

5. Click **"SAVE AND CONTINUE"** en cada paso

### 3. Publicar la Aplicación

1. En OAuth consent screen
2. Busca "Publishing status"
3. Click **"PUBLISH APP"**
4. Confirma la acción

**Resultado:**
- ✅ Logo de Market del Cevil visible
- ✅ Nombre destacado
- ✅ Links a privacy y terms
- ✅ Aplicación pública (no limitada a test users)

### 4. Crear Páginas Básicas de Privacy y Terms

Crea estas páginas simples para cumplir con Google:

**src/app/privacy/page.tsx:**
```tsx
export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      <div className="prose">
        <p>Última actualización: {new Date().toLocaleDateString()}</p>

        <h2>Información que recopilamos</h2>
        <p>
          Al usar nuestro servicio de autenticación con Google, recopilamos:
        </p>
        <ul>
          <li>Nombre completo</li>
          <li>Dirección de correo electrónico</li>
          <li>Foto de perfil (si está disponible)</li>
        </ul>

        <h2>Cómo usamos tu información</h2>
        <p>
          Usamos tu información únicamente para:
        </p>
        <ul>
          <li>Crear y gestionar tu cuenta</li>
          <li>Procesar tus pedidos</li>
          <li>Comunicarnos contigo sobre tus pedidos</li>
        </ul>

        <h2>Seguridad</h2>
        <p>
          Tu información está protegida con:
        </p>
        <ul>
          <li>Encriptación SSL/TLS</li>
          <li>Almacenamiento seguro en Supabase</li>
          <li>Acceso limitado por roles</li>
        </ul>

        <h2>Contacto</h2>
        <p>
          Para preguntas sobre privacidad, contáctanos en: [tu-email]
        </p>
      </div>
    </div>
  );
}
```

**src/app/terms/page.tsx:**
```tsx
export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Términos de Servicio</h1>
      <div className="prose">
        <p>Última actualización: {new Date().toLocaleDateString()}</p>

        <h2>Aceptación de términos</h2>
        <p>
          Al usar Market del Cevil, aceptas estos términos de servicio.
        </p>

        <h2>Uso del servicio</h2>
        <p>
          Nuestro servicio te permite:
        </p>
        <ul>
          <li>Explorar nuestro catálogo de productos</li>
          <li>Realizar pedidos vía WhatsApp</li>
          <li>Guardar tu información de usuario</li>
        </ul>

        <h2>Cuenta de usuario</h2>
        <p>
          Eres responsable de mantener la seguridad de tu cuenta.
        </p>

        <h2>Cambios a los términos</h2>
        <p>
          Nos reservamos el derecho de modificar estos términos en cualquier momento.
        </p>

        <h2>Contacto</h2>
        <p>
          Para preguntas, contáctanos en: [tu-email]
        </p>
      </div>
    </div>
  );
}
```

---

## Solución a Largo Plazo

### Dominio Personalizado en Supabase

1. **Compra un dominio** (si no tienes): `market-del-cevil.com`

2. **Configura subdominio:**
   - Crea registro CNAME: `auth.market-del-cevil.com` → Supabase

3. **En Supabase:**
   - Settings → Custom Domains
   - Agrega `auth.market-del-cevil.com`
   - Sigue instrucciones de verificación DNS

4. **Actualiza Google OAuth:**
   - Cambia redirect URI a: `https://auth.market-del-cevil.com/auth/v1/callback`

**Resultado final:**
- ✅ URL profesional: `auth.market-del-cevil.com`
- ✅ Cero mención a Supabase
- ✅ Máxima confianza del usuario

---

## Comparación

| Aspecto | Sin Cambios | Con Logo + Publish | Con Dominio Custom |
|---------|-------------|--------------------|--------------------|
| Tiempo | 0 min | 15 min | 2-3 días |
| Costo | Gratis | Gratis | ~$15/año dominio |
| URL visible | Supabase fea | Supabase fea | Tu dominio |
| Logo | No | Sí ✅ | Sí ✅ |
| Confianza | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Recomendación

**Ahora:** Opción 1 (Logo + Publish)
**Después:** Opción 2 (Dominio personalizado)

Con solo 15 minutos de configuración, la experiencia mejora significativamente. El dominio personalizado es ideal para cuando lances oficialmente.
