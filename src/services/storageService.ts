import { getSupabase } from '../lib/supabase';

export const HOTEL_MEDIA_BUCKET = 'hotel-media';

export interface UploadedMediaResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  error?: string;
}

/**
 * Uploads an image file from the user's device directly to Supabase Storage (`hotel-media` bucket)
 * and returns its permanent public URL for website display.
 */
export async function uploadImageToSupabase(
  file: File,
  folder: 'hero' | 'rooms' | 'gallery' | 'banquet' | 'general' = 'general'
): Promise<UploadedMediaResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client is not initialized.',
    };
  }

  try {
    // Sanitize filename
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseName = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);

    const filePath = `${folder}/${Date.now()}-${baseName || 'photo'}.${ext || 'jpg'}`;

    const { error: uploadError } = await supabase.storage
      .from(HOTEL_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadError) {
      return {
        success: false,
        error:
          uploadError.message.includes('row-level security') ||
          uploadError.message.includes('AccessDenied')
            ? 'Supabase Storage permission pending: Please run the Storage Policy SQL in your Supabase SQL Editor (see instructions).'
            : uploadError.message,
      };
    }

    const { data: pubData } = supabase.storage.from(HOTEL_MEDIA_BUCKET).getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: pubData.publicUrl,
      path: filePath,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to upload image to Supabase Storage.',
    };
  }
}
