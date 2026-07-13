const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Downscales an image file to a max of 1600px on its longest edge and
 * re-encodes it as JPEG at ~0.8 quality, per SPEC §4.7, before it's stored.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("Failed to encode compressed image");
    return blob;
  } finally {
    bitmap.close();
  }
}
