"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Magnet } from "@/lib/magnets";
import { supabase } from "@/lib/supabase";

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

export default function MagnetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [magnet, setMagnet] = useState<Magnet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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
          setMagnet(null);
          return;
        }

        const { data, error } = await supabase
          .from("magnets")
          .select("id,name,photo_url,category,comment,place_name,created_at")
          .eq("id", params.id)
          .eq("user_id", currentUser.id)
          .single();

        if (error) {
          throw error;
        }

        setMagnet(data);
      } catch (error: unknown) {
        toast.error("マグネット詳細の取得に失敗しました。");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      void fetchMagnet();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("このマグネットを削除しますか？")) {
      return;
    }

    setIsDeleting(true);
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
        .delete()
        .eq("id", params.id)
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      toast.success("マグネットを削除しました。");
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      toast.error("マグネットの削除に失敗しました。");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">マグネット詳細</h1>

      {isLoading ? (
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      ) : !magnet ? (
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">対象のマグネットが見つかりません。</p>
          <Link
            href="/"
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-orange-100 px-4 text-sm font-semibold text-orange-700"
          >
            図鑑に戻る
          </Link>
        </div>
      ) : (
        <article className="space-y-4 rounded-[24px] bg-white p-5 shadow-sm">
          <Image
            src={magnet.photo_url}
            alt={magnet.name ?? "マグネット画像"}
            className="h-56 w-full rounded-2xl object-cover"
            width={640}
            height={320}
            unoptimized
          />
          <div className="space-y-2">
            <p className="text-xl font-bold text-gray-900">
              {magnet.name ?? "名前未設定のマグネット"}
            </p>
            <p className="text-sm text-gray-600">
              カテゴリ: {magnet.category ?? "未設定"}
            </p>
            <p className="text-sm text-gray-600">
              購入場所: {magnet.place_name ?? "未設定"}
            </p>
            <p className="text-sm text-gray-600">メモ: {magnet.comment ?? "なし"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href={`/magnet/${magnet.id}/edit`}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-orange-100 px-4 text-sm font-semibold text-orange-700"
            >
              編集する
            </Link>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                void handleDelete();
              }}
              className="min-h-11 rounded-2xl bg-red-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isDeleting ? "削除中..." : "削除する"}
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
