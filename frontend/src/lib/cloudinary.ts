/**
 * Cloudinary helpers — auto-generate thumbnail URLs.
 *
 * Cloudinary URL format:
 *   https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}.{ext}
 *
 * We insert `f_auto,q_auto` by default for format/quality optimization.
 * Add specific transformations like `w_300,h_200,c_fill` for thumbnails.
 */

const DEFAULT_TRANSFORMATIONS = "f_auto,q_auto";

/**
 * Apply Cloudinary transformations to a URL.
 * If the URL is not from Cloudinary (e.g., legacy local), return as-is.
 */
export function cloudinaryTransform(
  url: string,
  transformations: string = DEFAULT_TRANSFORMATIONS
): string {
  if (!url || !url.includes("res.cloudinary.com")) {
    return url; // not a Cloudinary URL, return unchanged
  }

  // URL pattern: .../image/upload/[v123/]{public_id}.{ext}
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx === -1) return url;

  // Insert transformations right after /upload/
  const before = url.substring(0, uploadIdx + "/upload/".length);
  const after = url.substring(uploadIdx + "/upload/".length);

  return `${before}${transformations}/${after}`;
}

/**
 * Predefined sizes for common UI contexts.
 */
export const ROOM_IMAGE_PRESETS = {
  // Tiny: row in table
  thumbnail: "w_80,h_60,c_fill,f_auto,q_auto",
  // Small: card preview in dashboard
  card: "w_600,h_360,c_fill,f_auto,q_auto",
  // Large: detail page hero
  detail: "w_1200,h_700,c_fill,f_auto,q_auto",
  // Full: lightbox
  full: "f_auto,q_auto",
} as const;

/**
 * Convenience: get a properly-sized URL for a room image.
 */
export function roomImageUrl(
  url: string,
  preset: keyof typeof ROOM_IMAGE_PRESETS = "card"
): string {
  return cloudinaryTransform(url, ROOM_IMAGE_PRESETS[preset]);
}
