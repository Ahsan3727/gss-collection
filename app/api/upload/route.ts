import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdminApi } from '@/lib/admin-auth';
import { getEnv } from '@/lib/env';
import { logAdminAction } from '@/lib/models/AuditLog';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  const ip = clientIpFromRequest(req);
  const limit = await rateLimit(`upload:${ip}`, 30, 60);
  if (!limit.success) {
    return rateLimitExceededResponse(limit.reset);
  }

  let cloudName = '';
  let apiKey = '';
  let apiSecret = '';
  try {
    const env = getEnv();
    cloudName = env.CLOUDINARY_CLOUD_NAME;
    apiKey = env.CLOUDINARY_API_KEY;
    apiSecret = env.CLOUDINARY_API_SECRET;
  } catch (err: unknown) {
    console.error('[Cloudinary Upload Error]: configuration missing');
    const message = err instanceof Error ? err.message : 'Image storage is not configured';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedFolder = String(formData.get('folder') || 'products');
    const folder = requestedFolder === 'hero' ? 'gss/hero' : 'gss/products';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, AVIF, or GIF images can be uploaded' },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 8MB or smaller' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
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
    await logAdminAction(
      auth.user.email,
      'upload_image',
      'Media',
      result.public_id,
      { folder },
      ip
    );

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err: unknown) {
    console.error('[Cloudinary Upload Error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
  }
}
