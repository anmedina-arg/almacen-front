import Link from 'next/link';
import Image from 'next/image';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreBySlug } from '@/lib/store/getStoreBySlug';
import { DEFAULT_LOGO_URL } from '@/lib/store/defaultLogo';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  const supabase = await createSupabaseServerClient();
  const storeData = await getStoreBySlug(supabase, store);
  const storeName = storeData?.name ?? 'la tienda';
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src={storeData?.logo_url ?? DEFAULT_LOGO_URL}
              alt={`${storeName} Logo`}
              width={80}
              height={80}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">Crear Cuenta</h1>
          <p className="text-gray-600">
            Regístrate en {storeName}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <RegisterForm />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O continúa con</span>
            </div>
          </div>

          <GoogleAuthButton />

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href={`/${store}/login`} className="text-green-600 hover:text-green-700 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href={`/${store}`} className="text-sm text-gray-600 hover:text-gray-800">
            ← Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
