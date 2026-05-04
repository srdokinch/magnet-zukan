"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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
};

const initialForm: EditMagnetForm = {
  name: "",
  photoUrl: "",
  category: "",
  placeName: "",
  comment: "",
};

export default function EditMagnetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<EditMagnetForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          .select("name,photo_url,category,place_name,comment")
          .eq("id", params.id)
          .eq("user_id", currentUser.id)
          .single();

        if (error) {
          throw error;
        }

        setForm({
          name: data.name ?? "",
          photoUrl: data.photo_url,
          category: data.category ?? "",
          placeName: data.place_name ?? "",
          comment: data.comment ?? "",
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

    if (!form.photoUrl.trim()) {
      toast.error("写真URLは必須です。");
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

      const { error } = await supabase
        .from("magnets")
        .update({
          name: form.name || null,
          photo_url: form.photoUrl,
          category: form.category || null,
          place_name: form.placeName || null,
          comment: form.comment || null,
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
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">名前</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">写真URL（必須）</span>
            <input
              required
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="url"
              value={form.photoUrl}
              onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">カテゴリ</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="text"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">購入場所</span>
            <input
              className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
              type="text"
              value={form.placeName}
              onChange={(event) => setForm({ ...form, placeName: event.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">メモ</span>
            <textarea
              className="w-full rounded-2xl border border-orange-200 px-3 py-3 text-sm"
              rows={4}
              value={form.comment}
              onChange={(event) => setForm({ ...form, comment: event.target.value })}
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
