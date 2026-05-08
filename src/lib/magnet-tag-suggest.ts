import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

const MAX_SUGGESTED_TAGS = 3;
export const FALLBACK_AI_SUGGESTED_TAGS = ["陶器", "地中海", "青色"];

type SuggestTagsResponse = {
  tags?: unknown;
};

export type SuggestMagnetTagsResult = {
  tags: string[];
  isFallback: boolean;
};

const isE2ERuntime = () =>
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __MAGNET_ZUKAN_E2E__?: boolean }).__MAGNET_ZUKAN_E2E__);

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const base64 = text.includes(",") ? text.split(",")[1] : text;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("画像の読み取りに失敗しました。"));
    reader.readAsDataURL(file);
  });

const normalizeTags = (rawTags: unknown) => {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  const unique = new Set<string>();
  for (const value of rawTags) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    unique.add(normalized);
    if (unique.size >= MAX_SUGGESTED_TAGS) {
      break;
    }
  }
  return Array.from(unique);
};

export async function suggestMagnetTags(file: File): Promise<SuggestMagnetTagsResult> {
  if (isE2ERuntime()) {
    return { tags: FALLBACK_AI_SUGGESTED_TAGS, isFallback: true };
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 960,
      useWebWorker: true,
      initialQuality: 0.8,
    });
    const imageBase64 = await fileToBase64(compressedFile);
    const { data, error } = await supabase.functions.invoke<SuggestTagsResponse>("suggest-tags", {
      body: {
        imageBase64,
        mimeType: compressedFile.type || "image/jpeg",
      },
    });

    if (error) {
      throw error;
    }

    const tags = normalizeTags(data?.tags);
    if (tags.length === 0) {
      return { tags: FALLBACK_AI_SUGGESTED_TAGS, isFallback: true };
    }

    return { tags, isFallback: false };
  } catch (error) {
    console.error(error);
    return { tags: FALLBACK_AI_SUGGESTED_TAGS, isFallback: true };
  }
}
