"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TagChipInput } from "@/components/magnet/tag-chip-input";
import { uploadMagnetPhotoToStorage } from "@/lib/magnet-photo-upload";
import {
  FALLBACK_AI_SUGGESTED_TAGS,
  suggestMagnetTags,
} from "@/lib/magnet-tag-suggest";
import { supabase } from "@/lib/supabase";

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

type NewMagnetForm = {
  name: string;
  category: string;
  placeName: string;
  price: string;
  purchasedAt: string;
  comment: string;
  tags: string[];
};

const initialForm: NewMagnetForm = {
  name: "",
  category: "",
  placeName: "",
  price: "",
  purchasedAt: "",
  comment: "",
  tags: [],
};

const categoryOptions = ["旅行・観光", "食べ物・飲物", "動物・キャラ", "その他"];
const defaultPhotoUrl =
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200";

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
  const { default: heic2any } = await import("heic2any");
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

export default function NewMagnetPage() {
  const [form, setForm] = useState<NewMagnetForm>(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>(FALLBACK_AI_SUGGESTED_TAGS);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const suggestRequestIdRef = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const objectPreviewUrl = useMemo(() => {
    if (!photoFile) {
      return null;
    }
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    if (!objectPreviewUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(objectPreviewUrl);
    };
  }, [objectPreviewUrl]);

  const previewUrl = objectPreviewUrl ?? defaultPhotoUrl;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError && !isAuthSessionMissingError(userError)) {
        throw userError;
      }
      let currentUser = user;
      if (!currentUser) {
        const { data: anonymousData, error: anonymousError } =
          await supabase.auth.signInAnonymously();

        if (anonymousError) {
          throw anonymousError;
        }
        currentUser = anonymousData.user;
      }
      if (!currentUser) {
        throw new Error("匿名セッションの作成に失敗しました。");
      }

      let uploadedPhotoUrl = defaultPhotoUrl;
      if (photoFile) {
        uploadedPhotoUrl = await uploadMagnetPhotoToStorage(
          supabase,
          currentUser.id,
          photoFile,
        );
      }

      const { data, error } = await supabase
        .from("magnets")
        .insert({
          user_id: currentUser.id,
          name: form.name || null,
          photo_url: uploadedPhotoUrl,
          category: form.category || null,
          tags: form.tags.length > 0 ? form.tags : null,
          place_name: form.placeName || null,
          price: form.price.trim() ? Number(form.price) : null,
          purchased_at: form.purchasedAt || null,
          comment: form.comment || null,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }
      if (!data || typeof data.id !== "string") {
        throw new Error("追加結果のID取得に失敗しました。");
      }

      toast.success("マグネットを追加しました。");
      router.push(`/magnet/${data.id}`);
    } catch (error: unknown) {
      toast.error("マグネットの追加に失敗しました。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 pb-40">
      <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-orange-100 bg-white/90 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition hover:bg-orange-50"
          aria-label="閉じる"
        >
          ×
        </button>
        <h1 className="text-lg font-bold tracking-tight text-orange-600">新規投稿</h1>
        <div className="w-11" />
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <label className="relative block aspect-4/3 cursor-pointer overflow-hidden rounded-4xl border-2 border-dashed border-orange-200 bg-orange-50/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="写真プレビュー"
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                suggestRequestIdRef.current += 1;
                const requestId = suggestRequestIdRef.current;
                const selectedFile = event.target.files?.[0] ?? null;
                setPhotoFile(selectedFile);
                if (!selectedFile) {
                  setSuggestedTags(FALLBACK_AI_SUGGESTED_TAGS);
                  setIsSuggestingTags(false);
                  return;
                }
                setIsSuggestingTags(true);
                void (async () => {
                  let fileForProcessing = selectedFile;
                  if (isHeicLikeFile(selectedFile)) {
                    try {
                      fileForProcessing = await convertHeicToJpeg(selectedFile);
                      if (requestId === suggestRequestIdRef.current) {
                        setPhotoFile(fileForProcessing);
                      }
                    } catch (error) {
                      console.error(error);
                      if (requestId === suggestRequestIdRef.current) {
                        setSuggestedTags(FALLBACK_AI_SUGGESTED_TAGS);
                        toast.error("HEIC画像の変換に失敗したため、固定候補を表示しています。");
                      }
                      return;
                    }
                  }

                  const result = await suggestMagnetTags(fileForProcessing);
                  if (requestId !== suggestRequestIdRef.current) {
                    return;
                  }
                  setSuggestedTags(result.tags);
                  if (result.isFallback) {
                    toast.error("AIタグ提案の取得に失敗したため、固定候補を表示しています。");
                  }
                })().finally(() => {
                  if (requestId === suggestRequestIdRef.current) {
                    setIsSuggestingTags(false);
                  }
                });
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="rounded-2xl bg-white/85 px-4 py-3 text-center shadow-sm">
                <p className="text-2xl">📷</p>
                <p className="text-xs font-semibold text-orange-600">
                  {photoFile ? "画像を変更する" : "写真をアップロード"}
                </p>
              </div>
            </div>
          </label>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sky-600">✨</span>
            <h3 className="text-xs font-semibold tracking-wide text-sky-700">AI自動タグ提案</h3>
          </div>
          {isSuggestingTags ? (
            <p className="mb-2 text-xs text-sky-700">候補を生成中...</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-sky-700"
                onClick={() => {
                  if (form.tags.includes(tag)) {
                    return;
                  }
                  setForm({ ...form, tags: [...form.tags, tag] });
                }}
              >
                #{tag} ＋
              </button>
            ))}
          </div>
        </section>

        <div className="rounded-3xl border border-orange-100 bg-white/80 p-4 shadow-sm">
          <TagChipInput
            tags={form.tags}
            onChange={(next) => setForm({ ...form, tags: next })}
            hint="カンマ区切りで複数入力できます。"
          />
        </div>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="px-1 text-xs font-semibold tracking-wide text-gray-500">マグネット名</span>
            <input
              className="h-14 w-full rounded-3xl border-none bg-white px-6 text-sm shadow-sm ring-1 ring-orange-100 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-300"
              placeholder="例：アマルフィの思い出"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              aria-label="名前"
            />
          </label>

          <div className="space-y-2">
            <span className="block px-1 text-xs font-semibold tracking-wide text-gray-500">カテゴリ</span>
            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
              {categoryOptions.map((option) => {
                const active = form.category === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setForm({ ...form, category: option })}
                    className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <input
              className="h-12 w-full rounded-3xl border-none bg-white px-6 text-sm shadow-sm ring-1 ring-orange-100 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-300"
              placeholder="自由入力も可能"
              type="text"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              aria-label="カテゴリ"
            />
          </div>

          <label className="block space-y-2">
            <span className="px-1 text-xs font-semibold tracking-wide text-gray-500">購入場所</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                📍
              </span>
              <input
                className="h-14 w-full rounded-3xl border-none bg-white pl-12 pr-6 text-sm shadow-sm ring-1 ring-orange-100 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-300"
                placeholder="場所を検索"
                type="text"
                value={form.placeName}
                onChange={(event) => setForm({ ...form, placeName: event.target.value })}
                aria-label="購入場所"
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="px-1 text-xs font-semibold tracking-wide text-gray-500">値段</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                  ¥
                </span>
                <input
                  className="h-14 w-full rounded-3xl border-none bg-white pl-10 pr-6 text-sm shadow-sm ring-1 ring-orange-100 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-300"
                  placeholder="500"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="px-1 text-xs font-semibold tracking-wide text-gray-500">購入日</span>
              <input
                className="h-14 w-full rounded-3xl border-none bg-white px-6 text-sm shadow-sm ring-1 ring-orange-100 focus:ring-2 focus:ring-orange-300"
                type="date"
                value={form.purchasedAt}
                onChange={(event) => setForm({ ...form, purchasedAt: event.target.value })}
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="px-1 text-xs font-semibold tracking-wide text-gray-500">メモ</span>
            <textarea
              className="w-full resize-none rounded-3xl border-none bg-white px-6 py-4 text-sm shadow-sm ring-1 ring-orange-100 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-300"
              placeholder="思い出や特徴をメモしましょう"
              rows={4}
              value={form.comment}
              onChange={(event) => setForm({ ...form, comment: event.target.value })}
              aria-label="メモ"
            />
          </label>
        </div>

        <div className="fixed inset-x-0 bottom-20 z-40 px-5">
          <div className="mx-auto w-full max-w-md">
            <button
              disabled={isSubmitting}
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-base font-bold text-white shadow-[0_8px_30px_rgba(249,115,22,0.3)] transition disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              <span>💾</span>
              {isSubmitting ? "追加中..." : "🧲 コレクションに追加"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
