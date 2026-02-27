import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';

export async function POST(request: Request) {
  const { isAdmin, error: authError } = await verifyAdminAuth();
  if (!isAdmin) {
    return NextResponse.json(
      { error: authError || 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  const { timestamp, folder } = await request.json() as { timestamp: number; folder: string };

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'Cloudinary no configurado' }, { status: 500 });
  }

  // Params ordenados alfabéticamente (requerido por Cloudinary)
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return NextResponse.json({
    signature,
    timestamp,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
}
