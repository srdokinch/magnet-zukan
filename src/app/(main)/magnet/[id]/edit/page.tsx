"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { TagChipInput } from "@/components/magnet/tag-chip-input";
import { uploadMagnetPhotoToStorage } from "@/lib/magnet-photo-upload";
import { supabase } from "@/lib/supabase";

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

type EditMagnetForm = {
  name: string;
  photoUrl: string;
  category: string;
  placeName: string;
  comment: string;
  tags: string[];
};

const initialForm: EditMagnetForm = {
  name: "",
  photoUrl: "",
  category: "",
  placeName: "",
  comment: "",
  tags: [],
};

export default function EditMagnetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<EditMagnetForm>(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const previewUrl = objectPreviewUrl ?? form.photoUrl;

  useEffect(() => {
    const fetchMagnet = async () => {
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

        const { data, error } = await supabase
          .from("magnets")
          .select("name,photo_url,category,place_name,comment,tags")
          .eq("id", params.id)
          .eq("user_id", currentUser.id)
          .single();

        if (error) {
          throw error;
        }

        const rowTags = Array.isArray(data.tags)
          ? data.tags.filter((t): t is string => typeof t === "string")
          : [];

        setForm({
          name: data.name ?? "",
          photoUrl: data.photo_url,
          category: data.category ?? "",
          placeName: data.place_name ?? "",
          comment: data.comment ?? "",
          tags: rowTags,
        });
      } catch (error: unknown) {
        toast.error("編集対象データの取得に失敗しました。");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      void fetchMagnet();
    }
  }, [params.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.photoUrl.trim() && !photoFile) {
      toast.error("写真が設定されていません。画像をアップロードしてください。");
      return;
    }

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

      let photoUrl = form.photoUrl.trim();
      if (photoFile) {
        photoUrl = await uploadMagnetPhotoToStorage(
          supabase,
          currentUser.id,
          photoFile,
        );
      }

      const { error } = await supabase
        .from("magnets")
        .update({
          name: form.name || null,
          photo_url: photoUrl,
          category: form.category || null,
          place_name: form.placeName || null,
          comment: form.comment || null,
          tags: form.tags.length > 0 ? form.tags : null,
        })
        .eq("id", params.id)
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      toast.success("マグネットを更新しました。");
      router.push(`/magnet/${params.id}`);
      router.refresh();
    } catch (error: unknown) {
      toast.error("マグネットの更新に失敗しました。");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">マグネット編集</h1>
      {isLoading ? (
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      ) : (
        <form
          className="space-y-4 rounded-[24px] bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <label className="relative block aspect-4/3 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="写真プレビュー"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPhotoFile(file);
              }}
              aria-label="写真を差し替え（任意）"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
              <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-sm">
                <p className="text-2xl">📷</p>
                <p className="text-xs font-semibold text-orange-600">
                  {photoFile ? "画像を変更する" : "写真を差し替え（任意）"}
                </p>
              </div>
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">名前</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              aria-label="名前"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">カテゴリ</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="text"
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              aria-label="カテゴリ"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">購入場所</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="text"
              value={form.placeName}
              onChange={(event) =>
                setForm({ ...form, placeName: event.target.value })
              }
              aria-label="購入場所"
            />
          </label>
          <TagChipInput
            tags={form.tags}
            onChange={(next) => setForm({ ...form, tags: next })}
            hint="カンマ区切りで複数入力できます。"
          />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">メモ</span>
            <textarea
              className="w-full rounded-2xl border border-orange-200 px-3 py-3 text-sm"
              rows={4}
              value={form.comment}
              onChange={(event) =>
                setForm({ ...form, comment: event.target.value })
              }
              aria-label="メモ"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSubmitting ? "更新中..." : "更新する"}
          </button>
        </form>
      )}
    </section>
  );
}
