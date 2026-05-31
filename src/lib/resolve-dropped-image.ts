/**
 * ドラッグ&ドロップで渡される画像を File にまとめる。
 * - ローカルファイル: dataTransfer.files
 * - ブラウザ上の画像: text/uri-list / text/plain / text/html の URL を fetch して Blob 化
 */

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)$/i;

const isAllowedHttpUrl = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

const normalizeImageUrl = (raw: string) =>
  raw
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');

const filenameFromUrl = (url: string, mime: string) => {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() || "image";
    if (IMAGE_EXT.test(base)) {
      return base;
    }
  } catch {
    /* ignore */
  }
  if (mime.includes("png")) {
    return "image.png";
  }
  if (mime.includes("webp")) {
    return "image.webp";
  }
  if (mime.includes("gif")) {
    return "image.gif";
  }
  return "image.jpg";
};

const firstUriFromUriList = (raw: string) => {
  const line = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  return line ?? "";
};

const pickUrlFromHtml = (html: string) => {
  const img = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (img?.[1]) {
    return normalizeImageUrl(img[1]);
  }
  const href = /<a[^>]+href=["'](https?:[^"']+)["']/i.exec(html);
  return href?.[1] ? normalizeImageUrl(href[1]) : null;
};

const pickImageFileFromList = (files: FileList | null | undefined) => {
  if (!files?.length) {
    return null;
  }
  return (
    Array.from(files).find((item) => item.type.startsWith("image/")) ??
    Array.from(files).find((item) => IMAGE_EXT.test(item.name)) ??
    null
  );
};

const fetchUrlAsImageFile = async (url: string): Promise<File | null> => {
  if (!isAllowedHttpUrl(url)) {
    return null;
  }
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) {
      return null;
    }
    const blob = await res.blob();
    const mime = blob.type || "";
    const looksImage =
      mime.startsWith("image/") || IMAGE_EXT.test(new URL(url).pathname);
    if (!looksImage) {
      return null;
    }
    const name = filenameFromUrl(url, mime);
    return new File([blob], name, {
      type: mime || "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
};

/**
 * dataTransfer から画像 File を1件返す。取得できなければ null。
 * URL 経由で fetch する場合は CORS により失敗することがある。
 */
export async function resolveDroppedImageAsFile(
  dataTransfer: DataTransfer | null,
): Promise<{ file: File | null; hadPayload: boolean }> {
  if (!dataTransfer) {
    return { file: null, hadPayload: false };
  }

  const fromFiles = pickImageFileFromList(dataTransfer.files);
  if (fromFiles) {
    return { file: fromFiles, hadPayload: true };
  }

  const uriListRaw = dataTransfer.getData("text/uri-list");
  const plainRaw = dataTransfer.getData("text/plain");
  const htmlRaw = dataTransfer.getData("text/html");

  const candidates: string[] = [];
  if (uriListRaw) {
    const u = normalizeImageUrl(firstUriFromUriList(uriListRaw));
    if (u) {
      candidates.push(u);
    }
  }
  if (plainRaw) {
    const u = normalizeImageUrl(plainRaw);
    if (u && isAllowedHttpUrl(u)) {
      candidates.push(u);
    }
  }
  if (htmlRaw) {
    const u = pickUrlFromHtml(htmlRaw);
    if (u) {
      candidates.push(u);
    }
  }

  const url = candidates.find((u) => isAllowedHttpUrl(u));
  if (!url) {
    const hadPayload =
      Boolean(dataTransfer.files?.length) ||
      Boolean(uriListRaw) ||
      Boolean(plainRaw) ||
      Boolean(htmlRaw);
    return { file: null, hadPayload };
  }

  const file = await fetchUrlAsImageFile(url);
  return { file, hadPayload: true };
}
