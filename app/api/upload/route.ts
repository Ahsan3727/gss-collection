import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdminApi } from '@/lib/admin-auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'qqqoqjok',
  api_key: process.env.CLOUDINARY_API_KEY || '784954882844857',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'w8L2i3O43t1vOretbv-papF1Qw8',
  secure: true,
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'gss/products',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      uploadStream.end(buffer);
    });

    const result = await uploadPromise;

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err: any) {
    console.error('[Cloudinary Upload Error]:', err);
    return NextResponse.json({ error: err.message || 'Image upload failed' }, { status: 500 });
  }
}
