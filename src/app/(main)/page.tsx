"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MagnetListFilters } from "@/components/magnet/magnet-list-filters";
import type { Magnet } from "@/lib/magnets";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

type SortOption = "newest" | "purchased" | "place";

export default function DictionaryPage() {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [detailMagnetId, setDetailMagnetId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const selectedMagnet = useMemo(
    () => magnets.find((magnet) => magnet.id === detailMagnetId) ?? null,
    [detailMagnetId, magnets],
  );

  const buildOrderQuery = useCallback(
    (offset: number) => {
      if (!currentUserId) {
        return null;
      }
      let query = supabase
        .from("magnets")
        .select(
          "id,name,photo_url,category,tags,comment,place_name,created_at,purchased_at",
        )
        .eq("user_id", currentUserId);

      if (sortOption === "purchased") {
        query = query.order("purchased_at", { ascending: false, nullsFirst: false });
      } else if (sortOption === "place") {
        query = query.order("place_name", { ascending: true, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      return query.range(offset, offset + PAGE_SIZE - 1);
    },
    [currentUserId, sortOption],
  );

  const fetchMagnets = useCallback(
    async (offset: number) => {
      const query = buildOrderQuery(offset);
      if (!query) {
        return;
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const fetched = (data ?? []) as Magnet[];
      setMagnets((prev) => {
        if (offset === 0) {
          return fetched;
        }
        const seen = new Set(prev.map((magnet) => magnet.id));
        return [...prev, ...fetched.filter((magnet) => !seen.has(magnet.id))];
      });
      setHasMore(fetched.length === PAGE_SIZE);
    },
    [buildOrderQuery],
  );

  useEffect(() => {
    const bootstrap = async () => {
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
          setMagnets([]);
          setHasMore(false);
          return;
        }
        setCurrentUserId(currentUser.id);
      } catch (error: unknown) {
        toast.error("マグネット一覧の取得に失敗しました。");
        console.error(error);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    const timerId = window.setTimeout(() => {
      void fetchMagnets(0).catch((error: unknown) => {
        toast.error("マグネット一覧の取得に失敗しました。");
        console.error(error);
      });
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [currentUserId, sortOption, fetchMagnets]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || !currentUserId || isLoadingMore) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || isLoadingMore) {
          return;
        }
        setIsLoadingMore(true);
        void fetchMagnets(magnets.length)
          .catch((error: unknown) => {
            toast.error("追加読み込みに失敗しました。");
            console.error(error);
          })
          .finally(() => {
            setIsLoadingMore(false);
          });
      },
      { rootMargin: "240px" },
    );
    observer.observe(sentinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [currentUserId, fetchMagnets, hasMore, isLoadingMore, magnets.length]);

  const filteredMagnets = useMemo(() => {
    return magnets.filter((m) => {
      if (selectedCategory !== null && m.category !== selectedCategory) {
        return false;
      }
      if (selectedTags.length > 0) {
        const rowTags = m.tags ?? [];
        for (const t of selectedTags) {
          if (!rowTags.includes(t)) {
            return false;
          }
        }
      }
      const q = searchQuery.trim().toLowerCase();
      if (q.length > 0) {
        const name = (m.name ?? "").toLowerCase();
        const place = (m.place_name ?? "").toLowerCase();
        const comment = (m.comment ?? "").toLowerCase();
        if (!name.includes(q) && !place.includes(q) && !comment.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [magnets, searchQuery, selectedCategory, selectedTags]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-[#e0c0b1] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <p className="text-sm font-semibold text-[#9d4300]">
          {filteredMagnets.length}/{magnets.length}個 表示中
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#251913]">
          マグネット図鑑
        </h1>
      </header>

      {isLoadingInitial ? (
        <div className="rounded-3xl border border-[#e0c0b1] bg-white p-6 text-center text-[#584237] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          読み込み中...
        </div>
      ) : magnets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#e0c0b1] bg-white p-6 text-center text-[#584237]">
          まだ投稿がありません。
          <br />
          下の「投稿」から最初のマグネットを追加しましょう。
        </div>
      ) : (
        <>
          <MagnetListFilters
            magnets={magnets}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
          />
          <div className="rounded-3xl border border-[#e0c0b1] bg-[#fff1eb] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <label className="flex items-center gap-2 text-sm text-[#584237]">
              <span className="font-semibold">並び替え:</span>
              <select
                value={sortOption}
                onChange={(event) => {
                  setSortOption(event.target.value as SortOption);
                }}
                className="rounded-xl border border-[#e0c0b1] bg-white px-3 py-2"
              >
                <option value="newest">新着順</option>
                <option value="purchased">購入日順</option>
                <option value="place">場所順</option>
              </select>
            </label>
          </div>

          {filteredMagnets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#e0c0b1] bg-white p-6 text-center text-[#584237]">
              条件に一致するマグネットがありません。
              <br />
              検索語やフィルタを変えてみてください。
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {filteredMagnets.map((magnet) => (
                <li key={magnet.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailMagnetId(magnet.id);
                    }}
                    className="block w-full rounded-3xl border border-[#f6ded3] bg-white p-3 text-left shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition hover:bg-[#fff1eb]"
                  >
                    <div className="overflow-hidden rounded-2xl">
                      <Image
                        src={magnet.photo_url}
                        alt={magnet.name ?? "マグネット画像"}
                        width={320}
                        height={220}
                        className="h-28 w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#251913]">
                      {magnet.name ?? "名前未設定のマグネット"}
                    </p>
                    <p className="mt-1 text-xs text-[#584237]">
                      {magnet.place_name ?? "購入場所未設定"}
                      {magnet.category ? ` / ${magnet.category}` : ""}
                    </p>
                    {magnet.tags && magnet.tags.length > 0 ? (
                      <p className="mt-2 line-clamp-1 text-[11px] text-[#9d4300]">
                        {magnet.tags.map((t) => `#${t}`).join(" ")}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinelRef} className="h-6" aria-hidden />
          {isLoadingMore ? (
            <p className="text-center text-sm text-[#584237]">読み込み中...</p>
          ) : null}
          {!hasMore ? (
            <p className="text-center text-sm text-[#584237]">これ以上のデータはありません。</p>
          ) : null}
        </>
      )}

      {selectedMagnet ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <p className="text-lg font-bold text-[#251913]">
              {selectedMagnet.name ?? "名前未設定のマグネット"}
            </p>
            <p className="mt-1 text-sm text-[#584237]">
              {selectedMagnet.place_name ?? "購入場所未設定"}
              {selectedMagnet.category ? ` / ${selectedMagnet.category}` : ""}
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl">
              <Image
                src={selectedMagnet.photo_url}
                alt={selectedMagnet.name ?? "マグネット画像"}
                width={640}
                height={420}
                className="h-52 w-full object-cover"
                unoptimized
              />
            </div>
            {selectedMagnet.tags && selectedMagnet.tags.length > 0 ? (
              <p className="mt-3 text-sm text-[#9d4300]">
                {selectedMagnet.tags.map((tag) => `#${tag}`).join(" ")}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/magnet/${selectedMagnet.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-orange-100 px-4 text-sm font-semibold text-orange-700"
              >
                詳細へ
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDetailMagnetId(null);
                }}
                className="min-h-11 rounded-2xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
