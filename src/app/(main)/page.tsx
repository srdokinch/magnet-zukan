"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Magnet } from "@/lib/magnets";

export default function DictionaryPage() {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMagnets = async () => {
      try {
        const { data, error } = await supabase
          .from("magnets")
          .select("id,name,photo_url,category,comment,place_name,created_at")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setMagnets(data ?? []);
      } catch (error: unknown) {
        toast.error("マグネット一覧の取得に失敗しました。");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMagnets();
  }, []);

  return (
    <section className="space-y-4">
      <header className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-orange-600">全{magnets.length}個</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">マグネット図鑑</h1>
      </header>

      {isLoading ? (
        <div className="rounded-3xl bg-white p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      ) : magnets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-6 text-center text-gray-500">
          まだ投稿がありません。<br />
          下の「投稿」から最初のマグネットを追加しましょう。
        </div>
      ) : (
        <ul className="space-y-3">
          {magnets.map((magnet) => (
            <li key={magnet.id}>
              <Link
                href={`/magnet/${magnet.id}`}
                className="block rounded-3xl bg-white p-4 shadow-sm transition hover:bg-orange-50"
              >
                <p className="text-base font-bold text-gray-900">
                  {magnet.name ?? "名前未設定のマグネット"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {magnet.place_name ?? "購入場所未設定"}
                  {magnet.category ? ` / ${magnet.category}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
