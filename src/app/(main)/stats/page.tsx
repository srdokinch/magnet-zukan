"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  aggregateMagnetStats,
  type MagnetStatRow,
  type MagnetStats,
} from "@/lib/magnet-stats";

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

function formatJpy(n: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function StatsPage() {
  const [stats, setStats] = useState<MagnetStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
          setStats(null);
          return;
        }

        const { data: magnetRows, error: magnetError } = await supabase
          .from("magnets")
          .select(
            "id,price,purchased_at,category,tags,place_name,created_at",
          )
          .eq("user_id", currentUser.id);

        if (magnetError) {
          throw magnetError;
        }

        const rows = (magnetRows ?? []) as MagnetStatRow[];

        const { data: positionRows, error: positionError } = await supabase
          .from("magnet_positions")
          .select("magnet_id")
          .eq("user_id", currentUser.id);

        if (positionError) {
          throw positionError;
        }

        const fridgeMagnetIds = new Set(
          (positionRows ?? []).map((p) => p.magnet_id as string),
        );

        setStats(aggregateMagnetStats(rows, fridgeMagnetIds));
      } catch (error: unknown) {
        toast.error("統計の取得に失敗しました。");
        console.error(error);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const categoryMax = useMemo(() => {
    if (!stats?.byCategory.length) {
      return 0;
    }
    return Math.max(...stats.byCategory.map((c) => c.count));
  }, [stats]);

  const monthMax = useMemo(() => {
    if (!stats?.byMonth.length) {
      return 0;
    }
    return Math.max(...stats.byMonth.map((m) => m.count));
  }, [stats]);

  const tagMax = useMemo(() => {
    if (!stats?.topTags.length) {
      return 0;
    }
    return Math.max(...stats.topTags.map((t) => t.count));
  }, [stats]);

  return (
    <section className="space-y-4">
      <header className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-orange-600">
          あなたのコレクション
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          統計ダッシュボード
        </h1>
      </header>

      {isLoading ? (
        <div className="rounded-3xl bg-white p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      ) : !stats || stats.totalCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-6 text-center text-gray-500">
          まだマグネットがありません。
          <br />
          「図鑑」や「投稿」から追加すると、ここに集計が表示されます。
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">登録数</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.totalCount}
                <span className="text-base font-semibold text-gray-500">
                  個
                </span>
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">価格記録の合計</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.pricedCount > 0 ? formatJpy(stats.sumPrice) : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                価格入力 {stats.pricedCount} 件
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">平均価格</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.avgPrice != null ? formatJpy(stats.avgPrice) : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                価格が入っているマグネットのみ
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">冷蔵庫の配置</h2>
            <p className="mt-2 text-sm text-gray-600">
              バーチャル冷蔵庫に載せているマグネットは{" "}
              <span className="font-semibold text-orange-600">
                {stats.fridgePlacedCount}
              </span>{" "}
              個（全 {stats.totalCount} 個中）
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{
                  width: `${stats.totalCount > 0 ? (stats.fridgePlacedCount / stats.totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">購入場所の記録</h2>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-orange-600">
                {stats.placesRecorded}
              </span>{" "}
              / {stats.totalCount} 件で場所名が入っています
            </p>
          </div>

          {stats.byCategory.length > 0 ? (
            <div className="rounded-[24px] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">カテゴリ別</h2>
              <ul className="mt-4 space-y-3">
                {stats.byCategory.map((row) => (
                  <li key={row.label}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800">
                        {row.label}
                      </span>
                      <span className="text-gray-600">{row.count} 個</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="h-full rounded-full bg-orange-400"
                        style={{
                          width: `${categoryMax > 0 ? (row.count / categoryMax) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {stats.byMonth.length > 0 ? (
            <div className="rounded-[24px] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                月別（購入日があれば優先、なければ登録日）
              </h2>
              <ul className="mt-4 space-y-3">
                {stats.byMonth.map((row) => (
                  <li key={row.monthKey}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800">
                        {row.label}
                      </span>
                      <span className="text-gray-600">{row.count} 個</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="h-full rounded-full bg-orange-400"
                        style={{
                          width: `${monthMax > 0 ? (row.count / monthMax) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {stats.topTags.length > 0 ? (
            <div className="rounded-[24px] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                よく使うタグ
              </h2>
              <ul className="mt-4 space-y-3">
                {stats.topTags.map((row) => (
                  <li key={row.tag}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800">
                        #{row.tag}
                      </span>
                      <span className="text-gray-600">{row.count} 回</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="h-full rounded-full bg-orange-400"
                        style={{
                          width: `${tagMax > 0 ? (row.count / tagMax) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
