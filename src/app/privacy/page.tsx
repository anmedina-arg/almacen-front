import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl bg-white rounded-lg shadow-md p-8">
        <Link href="/" className="text-sm text-green-600 hover:text-green-700 mb-6 inline-block">
          ← Volver al inicio
        </Link>

        <h1 className="text-4xl font-bold mb-4">Política de Privacidad</h1>
        <p className="text-gray-600 mb-8">
          Última actualización: {new Date().toLocaleDateString('es-AR')}
        </p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-3">1. Información que recopilamos</h2>
            <p className="mb-3">
              Al usar nuestro servicio de autenticación, recopilamos la siguiente información:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nombre completo</li>
              <li>Dirección de correo electrónico</li>
              <li>Foto de perfil (cuando uses Google OAuth)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Cómo usamos tu información</h2>
            <p className="mb-3">
              Usamos tu información únicamente para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crear y gestionar tu cuenta de usuario</li>
              <li>Procesar tus pedidos de productos</li>
              <li>Comunicarnos contigo sobre tus pedidos vía WhatsApp</li>
              <li>Mejorar nuestros servicios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. Seguridad de datos</h2>
            <p className="mb-3">
              Protegemos tu información con:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encriptación SSL/TLS en todas las comunicaciones</li>
              <li>Almacenamiento seguro en servidores de Supabase</li>
              <li>Contraseñas hasheadas con bcrypt</li>
              <li>Acceso limitado mediante políticas de seguridad (RLS)</li>
              <li>Validación y sanitización de todos los inputs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. Compartir información</h2>
            <p>
              No compartimos, vendemos ni alquilamos tu información personal a terceros.
              Solo compartimos información necesaria con WhatsApp para procesar tus pedidos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Cookies y tecnologías similares</h2>
            <p>
              Usamos cookies para mantener tu sesión activa y mejorar tu experiencia.
              Puedes configurar tu navegador para rechazar cookies, pero esto puede
              afectar la funcionalidad del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Tus derechos</h2>
            <p className="mb-3">
              Tienes derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a tu información personal</li>
              <li>Corregir datos incorrectos</li>
              <li>Solicitar la eliminación de tu cuenta</li>
              <li>Exportar tus datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Contacto</h2>
            <p>
              Para preguntas sobre esta política de privacidad o para ejercer tus derechos,
              contáctanos a través de WhatsApp o email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Cambios a esta política</h2>
            <p>
              Nos reservamos el derecho de actualizar esta política en cualquier momento.
              Te notificaremos de cambios significativos a través de nuestro sitio web.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <Link href="/" className="text-green-600 hover:text-green-700 font-medium">
            ← Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
