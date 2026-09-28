import { getSupabase } from '../lib/supabase';

export const HOTEL_MEDIA_BUCKET = 'hotel-media';

export interface UploadedMediaResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  fileName?: string;
  error?: string;
}

/**
 * Compresses and resizes an image file in the browser using HTML5 Canvas
 * so it loads fast on mobile and desktop and can be stored directly in Supabase.
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 1280,
  quality: number = 0.82
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Failed to encode image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a single image file to Supabase Storage (`hotel-media` bucket).
 * If Storage bucket RLS policy is not yet enabled, automatically falls back to
 * optimized JPEG Data URL persistence in Supabase PostgreSQL so uploads never fail.
 */
export async function uploadImageToSupabase(
  file: File,
  folder: 'hero' | 'rooms' | 'gallery' | 'banquet' | 'general' = 'gallery'
): Promise<UploadedMediaResult> {
  const supabase = getSupabase();
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');

  try {
    const { blob, dataUrl } = await compressImageFile(file, 1280, 0.82);

    if (supabase) {
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40);

      const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${
        baseName || 'photo'
      }.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(HOTEL_MEDIA_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (!uploadError) {
        const { data: pubData } = supabase.storage
          .from(HOTEL_MEDIA_BUCKET)
          .getPublicUrl(filePath);

        return {
          success: true,
          publicUrl: pubData.publicUrl,
          path: filePath,
          fileName: cleanTitle,
        };
      }
    }

    // Automatic fallback: return optimized JPEG dataUrl which gets saved in Supabase table
    return {
      success: true,
      publicUrl: dataUrl,
      fileName: cleanTitle,
    };
  } catch (err: any) {
    return {
      success: false,
      fileName: cleanTitle,
      error: err.message || 'Failed to process image file.',
    };
  }
}

/**
 * Uploads multiple image files in batch to Supabase with live progress callback.
 */
export async function uploadMultipleImagesToSupabase(
  files: FileList | File[],
  folder: 'hero' | 'rooms' | 'gallery' | 'banquet' | 'general' = 'gallery',
  onProgress?: (completed: number, total: number) => void
): Promise<UploadedMediaResult[]> {
  const fileArray = Array.from(files);
  const results: UploadedMediaResult[] = [];
  const total = fileArray.length;

  for (let i = 0; i < total; i++) {
    const res = await uploadImageToSupabase(fileArray[i], folder);
    results.push(res);
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}
