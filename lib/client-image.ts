const SHRINK_ABOVE_BYTES = 3 * 1024 * 1024;
const TARGET_BYTES = 3.5 * 1024 * 1024;
const MAX_SIDE = 2400;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Compresses oversized raster images in the browser so uploads stay under hosting body limits.
 * Small files, GIFs, and SVGs pass through unchanged.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SHRINK_ABOVE_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let quality = 0.88;
    let blob = await canvasToBlob(canvas, quality);
    while (blob && blob.size > TARGET_BYTES && quality > 0.5) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, quality);
    }
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/**
 * Validates, shrinks if needed, and uploads an image file to Cloudinary via POST /api/upload.
 */
export async function uploadAdminImage(
  file: File,
  folder: 'products' | 'hero' | 'pages' = 'products'
): Promise<{ url: string; publicId?: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image.`);
  }

  const prepared = await shrinkImage(file);
  const body = new FormData();
  body.append('file', prepared);
  body.append('folder', folder);

  const res = await fetch('/api/upload', { method: 'POST', body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; publicId?: string; error?: string };

  if (!res.ok || !data.url) {
    throw new Error(
      res.status === 413 ? 'The photo is too large for the server.' : data.error || 'Upload failed.'
    );
  }

  return { url: data.url, publicId: data.publicId };
}
