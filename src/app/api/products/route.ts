import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { Product } from '@/types';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('products')
    .select(
      `
      id,
      name,
      price,
      image,
      active,
      categories,
      mainCategory:main_category
    `
    )
    .order('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Product[]);
}
