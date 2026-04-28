"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

type NewMagnetForm = {
  name: string;
  photoUrl: string;
  category: string;
  placeName: string;
  comment: string;
};

const initialForm: NewMagnetForm = {
  name: "",
  photoUrl: "",
  category: "",
  placeName: "",
  comment: "",
};

export default function NewMagnetPage() {
  const [form, setForm] = useState<NewMagnetForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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
      if (!user) {
        toast.error("投稿するにはログインが必要です。");
        return;
      }

      const { data, error } = await supabase
        .from("magnets")
        .insert({
          user_id: user.id,
          name: form.name || null,
          photo_url: form.photoUrl,
          category: form.category || null,
          place_name: form.placeName || null,
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
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">新規投稿</h1>
      <form
        className="space-y-4 rounded-[24px] bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-700">名前</span>
          <input
            className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
            placeholder="例：北海道ラベンダーマグネット"
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
            placeholder="https://..."
            type="url"
            value={form.photoUrl}
            onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-700">カテゴリ</span>
          <input
            className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
            placeholder="例：観光地"
            type="text"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-700">購入場所</span>
          <input
            className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
            placeholder="例：札幌駅"
            type="text"
            value={form.placeName}
            onChange={(event) => setForm({ ...form, placeName: event.target.value })}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-700">メモ</span>
          <textarea
            className="w-full rounded-2xl border border-orange-200 px-3 py-3 text-sm"
            placeholder="購入時のメモ"
            rows={4}
            value={form.comment}
            onChange={(event) => setForm({ ...form, comment: event.target.value })}
          />
        </label>
        <button
          disabled={isSubmitting}
          type="submit"
          className="min-h-11 w-full rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {isSubmitting ? "追加中..." : "🧲 コレクションに追加"}
        </button>
      </form>
    </section>
  );
}
