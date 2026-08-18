import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';

type StoreLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
};

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  const { store } = await params;
  return {
    manifest: `/${store}/manifest`,
  };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { store } = await params;

  const { data } = await supabaseServer
    .from('stores')
    .select('id')
    .eq('slug', store)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return children;
}
