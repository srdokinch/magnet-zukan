import imageCompression from "browser-image-compression";
import heic2any from "heic2any";
import { supabase } from "@/lib/supabase";

const MAX_SUGGESTED_TAGS = 3;
export const FALLBACK_AI_SUGGESTED_TAGS = ["陶器", "地中海", "青色"];

type SuggestTagsResponse = {
  tags?: unknown;
  scores?: Array<{ tag?: string; score?: number }>;
};

export type SuggestMagnetTagsResult = {
  tags: string[];
  isFallback: boolean;
};

const isE2ERuntime = () =>
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __MAGNET_ZUKAN_E2E__?: boolean }).__MAGNET_ZUKAN_E2E__);

const formatUnknownError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (typeof Event !== "undefined" && error instanceof Event) {
    const eventType = error.type || "unknown";
    return { message: `Browser event error: ${eventType}` };
  }
  return { message: "Unknown error", detail: String(error) };
};

const isHeicLikeFile = (file: File) => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    mime.includes("image/heic") ||
    mime.includes("image/heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
};

const convertHeicToJpeg = async (file: File) => {
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!(blob instanceof Blob)) {
    throw new Error("HEIC画像の変換に失敗しました。");
  }

  const jpgName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blob], jpgName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

const compressImageWithRetry = async (file: File) => {
  const baseOptions = {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 960,
    initialQuality: 0.8,
  } as const;

  try {
    return await imageCompression(file, {
      ...baseOptions,
      useWebWorker: true,
    });
  } catch (workerError) {
    console.warn("画像圧縮のWebWorkerに失敗したため、非WebWorkerで再試行します。", formatUnknownError(workerError));
    return imageCompression(file, {
      ...baseOptions,
      useWebWorker: false,
    });
  }
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const base64 = text.includes(",") ? text.split(",")[1] : text;
      resolve(base64);
    };
    reader.onerror = (event) => {
      const eventType = event?.type ?? "error";
      reject(reader.error ?? new Error(`画像の読み取りに失敗しました。(${eventType})`));
    };
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
    const isHeic = isHeicLikeFile(file);
    const sourceFile = isHeic ? await convertHeicToJpeg(file) : file;
    if (isHeic) {
      console.info("HEIC/HEIF画像をJPEGへ変換してAIタグ提案を実行します。");
    }

    const targetFile = await compressImageWithRetry(sourceFile);
    const imageBase64 = await fileToBase64(targetFile);
    const { data, error } = await supabase.functions.invoke<SuggestTagsResponse>("suggest-tags", {
      body: {
        imageBase64,
        mimeType: targetFile.type || "image/jpeg",
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
    console.error("AIタグ提案の取得に失敗しました。", formatUnknownError(error));
    return { tags: FALLBACK_AI_SUGGESTED_TAGS, isFallback: true };
  }
}
