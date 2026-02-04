import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl bg-white rounded-lg shadow-md p-8">
        <Link href="/" className="text-sm text-green-600 hover:text-green-700 mb-6 inline-block">
          ← Volver al inicio
        </Link>

        <h1 className="text-4xl font-bold mb-4">Términos de Servicio</h1>
        <p className="text-gray-600 mb-8">
          Última actualización: {new Date().toLocaleDateString('es-AR')}
        </p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-3">1. Aceptación de términos</h2>
            <p>
              Al acceder y usar Market del Cevil, aceptas estar sujeto a estos términos de servicio
              y a todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de
              estos términos, no debes usar nuestro servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Descripción del servicio</h2>
            <p className="mb-3">
              Market del Cevil es una plataforma de catálogo de productos que permite:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Explorar nuestro catálogo de productos</li>
              <li>Agregar productos a un carrito de compras</li>
              <li>Realizar pedidos vía WhatsApp</li>
              <li>Crear y gestionar una cuenta de usuario</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. Cuenta de usuario</h2>
            <p className="mb-3">
              Para usar ciertas funciones, debes crear una cuenta:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Debes proporcionar información precisa y completa</li>
              <li>Eres responsable de mantener la seguridad de tu contraseña</li>
              <li>Eres responsable de todas las actividades bajo tu cuenta</li>
              <li>Debes notificarnos inmediatamente de cualquier uso no autorizado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. Uso aceptable</h2>
            <p className="mb-3">
              Te comprometes a NO:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Usar el servicio para actividades ilegales</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Interferir con el funcionamiento del servicio</li>
              <li>Enviar spam o contenido malicioso</li>
              <li>Recopilar datos de otros usuarios sin su consentimiento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Pedidos y pagos</h2>
            <p>
              Los pedidos se procesan a través de WhatsApp. Los precios mostrados son informativos
              y pueden variar. La confirmación del pedido y el pago se coordinan directamente vía
              WhatsApp con nuestro equipo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Propiedad intelectual</h2>
            <p>
              Todo el contenido del sitio (imágenes, textos, logos, diseño) es propiedad de
              Market del Cevil o sus proveedores y está protegido por leyes de propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Limitación de responsabilidad</h2>
            <p>
              Market del Cevil no será responsable por daños indirectos, incidentales, especiales
              o consecuentes que resulten del uso o la imposibilidad de usar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Modificaciones del servicio</h2>
            <p>
              Nos reservamos el derecho de modificar o discontinuar el servicio en cualquier momento,
              con o sin previo aviso. No seremos responsables ante ti o terceros por cualquier
              modificación, suspensión o discontinuación del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. Terminación</h2>
            <p>
              Podemos terminar o suspender tu cuenta inmediatamente, sin previo aviso, por cualquier
              razón, incluyendo si violas estos términos de servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. Cambios a los términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento.
              Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">11. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República Argentina.
              Cualquier disputa se resolverá en los tribunales de Tucumán, Argentina.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">12. Contacto</h2>
            <p>
              Para preguntas sobre estos términos, contáctanos a través de WhatsApp o email.
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
