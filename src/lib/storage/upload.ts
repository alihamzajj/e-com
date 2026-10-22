import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CATALOG_BUCKET = "catalog";
// 4 MB keeps a single-file upload under Vercel's 4.5 MB request body limit.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Detects the real image type from the file's first bytes. */
export function sniffImageType(bytes: Uint8Array): string | null {
  const at = (i: number) => bytes[i];
  const ascii = (start: number, len: number) => String.fromCharCode(...bytes.slice(start, start + len));
  if (bytes.length < 12) return null;
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x89 && ascii(1, 3) === "PNG" && at(4) === 0x0d && at(5) === 0x0a) return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4))) return "image/avif";
  return null;
}

export type UploadResult = { ok: true; url: string; path: string } | { ok: false; error: string };

/**
 * Validates and uploads one image with the caller's (user-scoped) client, so
 * storage RLS decides whether this staff member may write to `folder`.
 */
export async function uploadImage(supabase: SupabaseClient, file: File, folder: string): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image file." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: `${file.name} is larger than 4 MB.` };
  if (!TYPES[file.type]) return { ok: false, error: `${file.name}: only JPEG, PNG, WebP or AVIF images are allowed.` };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(bytes);
  if (!detected || detected !== file.type) {
    return { ok: false, error: `${file.name} is not a valid ${TYPES[file.type].toUpperCase()} image.` };
  }

  const path = `${folder}/${crypto.randomUUID()}.${TYPES[detected]}`;
  const { error } = await supabase.storage.from(CATALOG_BUCKET).upload(path, bytes, {
    contentType: detected,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[storage.upload]", error.message);
    return { ok: false, error: "The image could not be uploaded. Check your permissions and try again." };
  }
  const { data } = supabase.storage.from(CATALOG_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

export async function removeImage(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return;
  const { error } = await supabase.storage.from(CATALOG_BUCKET).remove([path]);
  if (error) console.error("[storage.remove]", error.message);
}
