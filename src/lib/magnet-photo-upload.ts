import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Storage（magnet-photos）へ画像をアップロードし、公開 URL を返す。
 */
export async function uploadMagnetPhotoToStorage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const objectPath = `${userId}/${crypto.randomUUID()}.${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("magnet-photos")
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("magnet-photos")
    .getPublicUrl(objectPath);

  return publicUrlData.publicUrl;
}
