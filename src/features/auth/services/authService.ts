import { supabaseBrowser } from '@/lib/supabase/client';
import type { LoginCredentials, RegisterCredentials } from '../types/auth.types';

const supabase = supabaseBrowser;

export const authService = {
  async login(credentials: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    return data;
  },

  async register(credentials: RegisterCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.fullName,
        },
        emailRedirectTo: undefined, // No email confirmation
      },
    });

    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async signInWithGoogle() {
    // En preview/dev de Vercel, usar el origen actual
    // En producción, usar NEXT_PUBLIC_SITE_URL si está definida
    const isVercelPreview = typeof window !== 'undefined' &&
                           window.location.hostname.includes('vercel.app') &&
                           !window.location.hostname.startsWith('market-del-cevil');

    const baseUrl = isVercelPreview
      ? (typeof window !== 'undefined' ? window.location.origin : '')
      : (process.env.NEXT_PUBLIC_SITE_URL ||
         (typeof window !== 'undefined' ? window.location.origin : ''));

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },
};
