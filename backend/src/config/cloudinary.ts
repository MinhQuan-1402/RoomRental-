import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, // always use HTTPS
});

/**
 * Upload a file buffer to Cloudinary.
 * Returns the full secure URL of the uploaded image.
 *
 * @param buffer       - File buffer (from multer memory storage)
 * @param folder       - Cloudinary folder path, e.g. "room_rental/rooms"
 * @param filename     - Original filename (used for public_id base)
 * @param transformations - URL transformation string, e.g. "w_300,h_200,c_fill"
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string,
  transformations?: string
): Promise<string> {
  // Generate a unique public_id from filename + timestamp
  const timestamp = Date.now();
  const safeName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `${folder}/${safeName}_${timestamp}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${safeName}_${timestamp}`,
        resource_type: 'image',
        transformation: transformations
          ? (transformations.split(',').map((t) => {
              const [key, value] = t.split('_');
              return { [key]: value };
            }) as Record<string, string>[])
          : undefined,
        // Note: format 'auto' is only valid in URL transformation (f_auto),
        // not as top-level upload option. We let Cloudinary keep original format.
        // Quality optimization
        quality: 'auto',
        // Fetch remote URL if needed (not used here but good to have)
        fetch: false,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload returned no result'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its full secure URL.
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  // Extract public_id from URL
  // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{format}
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Find "upload" segment and everything after it
    const uploadIdx = pathParts.indexOf('upload');
    if (uploadIdx === -1) return;

    const publicIdWithExt = pathParts.slice(uploadIdx + 1).join('/');
    // Remove extension to get public_id
    const publicId = publicIdWithExt.replace(/\.[^.]+$/, '');

    await cloudinary.uploader.destroy(publicId);
  } catch {
    // If URL parsing fails, try to extract public_id via regex
    const match = url.match(/\/upload\/(.+)\.[a-z]+$/i);
    if (match) {
      await cloudinary.uploader.destroy(match[1]);
    }
    // If all parsing fails, silently skip deletion (not critical)
  }
}

/**
 * Get a resized/thumbnail URL from an existing Cloudinary image URL.
 * transformation format: "w_300,h_200,c_fill"
 */
export function getThumbnailUrl(url: string, transformation = 'w_300,h_200,c_fill'): string {
  // Insert transformation before the last /<public_id>.<format>
  const match = url.match(/(.+upload\/)(.+?)(\.[^.]+)$/);
  if (match) {
    return `${match[1]}f_auto,q_auto/${match[2]}${match[3]}`;
  }
  return url;
}

export { cloudinary };
