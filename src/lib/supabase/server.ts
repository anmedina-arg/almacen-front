import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// Movida a serverClient.ts (#144, spec #139) — re-exportada acá para no
// tocar los importadores existentes de '@/lib/supabase/server'. Un módulo
// que necesite quedar testeable sin arrastrar el supabaseServer eager de
// arriba (ej. roleHelpers.ts) debe importarla directo de serverClient.ts,
// no de acá.
export { createSupabaseServerClient } from './serverClient';
